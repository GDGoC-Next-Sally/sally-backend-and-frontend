"""
services/llm_service.py — LLM API 호출 및 TEACHER_SUMMARY 파싱
NVIDIA NIM OpenAI-compatible API를 사용합니다.
"""
import re
import json
import os
import asyncio
from difflib import SequenceMatcher
from pathlib import Path
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, RateLimitError
from dotenv import load_dotenv

from typing import AsyncGenerator
from ai_server.models import StudentProfile, ConversationTurn, RealtimeAnalysis
from ai_server.services.message_formatting import format_labeled_message, speaker_label
from ai_server.services.prompt_builder import build_chat_system_prompt, build_realtime_analysis_system_prompt, build_chat_few_shot_messages

# ai_server 폴더 안의 .env 파일을 명시적으로 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        print(f"[WARN] {name} 환경변수 값이 정수가 아닙니다. 기본값 {default}를 사용합니다: {raw}")
        return default


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        return default
    return value.strip().strip('"').strip("'")

# ── 모델 설정 (NVIDIA NIM OpenAI-compatible API) ────────────────────────────
NVIDIA_BASE_URL = _env_str(
    "NVIDIA_BASE_URL",
    "https://integrate.api.nvidia.com/v1",
)
NVIDIA_MODEL = _env_str("NVIDIA_MODEL", "google/gemma-4-31b-it")
CHAT_MODEL = _env_str("NVIDIA_CHAT_MODEL", "google/gemma-4-31b-it")
ANALYZE_MODEL = _env_str("NVIDIA_ANALYZE_MODEL", "nemotron-3-super-120b-a12b")

CHAT_HISTORY_MAX_TURNS = _env_int("CHAT_HISTORY_MAX_TURNS", 12)
CHAT_HISTORY_MAX_CHARS = _env_int("CHAT_HISTORY_MAX_CHARS", 6000)
CHAT_SUMMARY_MAX_CHARS = _env_int("CHAT_SUMMARY_MAX_CHARS", 1200)
CHAT_TEACHER_DIRECTIVE_MAX_ITEMS = _env_int("CHAT_TEACHER_DIRECTIVE_MAX_ITEMS", 3)
CHAT_TEACHER_DIRECTIVE_MAX_CHARS = _env_int("CHAT_TEACHER_DIRECTIVE_MAX_CHARS", 900)

# 한국어, 영어, 숫자, 기본 문장부호 외 문자를 강제 필터링합니다.
# 라틴 확장 문자(vẫn, thường, relação 등)와 한자/일본어/중국어 조각을 모두 잡습니다.
SUPPORTED_OUTPUT_CHARS = (
    r"\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F"
    r"A-Za-z0-9\s"
    r"""!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~"""
    r"“”‘’…·–—"
)
FOREIGN_CHAR_PATTERN = re.compile(rf"[^{SUPPORTED_OUTPUT_CHARS}]")
FOREIGN_TOKEN_PATTERN = re.compile(rf"[A-Za-z]*[^{SUPPORTED_OUTPUT_CHARS}][A-Za-z]*")
CHAT_MEMORY_SIGNAL_KEYWORDS = (
    "모르", "헷갈", "어렵", "안 돼", "안돼", "이해 안", "틀",
    "못하", "포기", "왜", "어떻게", "차이", "구분", "다시", "설명",
)

def _get_client() -> AsyncOpenAI:
    """API Key를 런타임에 읽어서 클라이언트를 생성합니다 (lazy init)."""
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")
    return AsyncOpenAI(
        base_url=NVIDIA_BASE_URL,
        api_key=api_key,
        timeout=120.0,  # 대형 모델의 긴 TTFT(첫 토큰 대기)를 위해 120초로 설정
    )


def _select_recent_chat_history(
    conversation_history: list[ConversationTurn],
) -> list[ConversationTurn]:
    """
    채팅 응답 생성에는 최근 대화만 사용합니다.
    고정 system/few-shot prefix는 매 요청 동일하게 유지하고 변하는 suffix를 제한하여,
    대화가 길어질수록 커지는 prefill 비용을 줄입니다.
    """
    if not conversation_history:
        return []

    if CHAT_HISTORY_MAX_TURNS <= 0 and CHAT_HISTORY_MAX_CHARS <= 0:
        return conversation_history

    max_turns = CHAT_HISTORY_MAX_TURNS if CHAT_HISTORY_MAX_TURNS > 0 else len(conversation_history)
    max_chars = CHAT_HISTORY_MAX_CHARS if CHAT_HISTORY_MAX_CHARS > 0 else sum(len(turn.text or "") for turn in conversation_history)
    selected_reversed: list[ConversationTurn] = []
    total_chars = 0

    for turn in reversed(conversation_history):
        turn_chars = len(turn.text or "") + len(turn.sender_type or "") + len(turn.student_name or "")
        would_exceed_turns = len(selected_reversed) >= max_turns
        would_exceed_chars = selected_reversed and (total_chars + turn_chars > max_chars)
        if would_exceed_turns or would_exceed_chars:
            break

        selected_reversed.append(turn)
        total_chars += turn_chars

    return list(reversed(selected_reversed))


def _clip_text(text: str, max_chars: int) -> str:
    normalized = " ".join((text or "").split())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "…"


def _clip_block(text: str, max_chars: int) -> str:
    normalized = "\n".join(
        " ".join(line.split())
        for line in (text or "").splitlines()
        if line.strip()
    )
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "…"


def _is_student_memory_turn(turn: ConversationTurn) -> bool:
    return turn.role != "model" and (turn.sender_type or "").upper() == "STUDENT"


def _is_teacher_memory_turn(turn: ConversationTurn) -> bool:
    return turn.role != "model" and (turn.sender_type or "").upper() in {"TEACHER", "SYSTEM"}


def _build_extract_summary_from_old_history(
    old_history: list[ConversationTurn],
) -> str | None:
    if not old_history:
        return None

    teacher_directives: list[str] = []
    student_signals: list[str] = []
    student_context: list[str] = []
    ai_checkpoints: list[str] = []

    for turn in old_history:
        text = _clip_text(turn.text, 180)
        if not text:
            continue

        if _is_teacher_memory_turn(turn):
            label = speaker_label(turn.sender_type, student_name=turn.student_name)
            teacher_directives.append(f"{label}: {text}")
            continue

        if _is_student_memory_turn(turn):
            label = speaker_label(turn.sender_type, student_name=turn.student_name)
            line = f"{label}: {text}"
            if any(keyword in text for keyword in CHAT_MEMORY_SIGNAL_KEYWORDS):
                student_signals.append(line)
            elif len(text) >= 8:
                student_context.append(line)
            continue

        if turn.role == "model" and any(marker in text for marker in ("?", "정리", "핵심", "확인", "퀴즈", "다음")):
            ai_checkpoints.append(f"Sally: {text}")

    lines: list[str] = []
    if teacher_directives:
        lines.append("이전 선생님/시스템 지시: " + " / ".join(teacher_directives[-2:]))
    if student_signals:
        lines.append("이전 학생 어려움 신호: " + " / ".join(student_signals[-3:]))
    if student_context:
        lines.append("이전 학생 맥락: " + " / ".join(student_context[-2:]))
    if ai_checkpoints:
        lines.append("이전 수업 진행 단서: " + " / ".join(ai_checkpoints[-2:]))

    if not lines:
        fallback = [
            f"{'Sally' if turn.role == 'model' else speaker_label(turn.sender_type, student_name=turn.student_name)}: {_clip_text(turn.text, 140)}"
            for turn in old_history[-3:]
            if _clip_text(turn.text, 140)
        ]
        lines.append("이전 대화 흐름: " + " / ".join(fallback))

    summary = "\n".join(f"- {line}" for line in lines if line)
    return _clip_block(summary, CHAT_SUMMARY_MAX_CHARS)


def _build_chat_memory_summary(
    provided_summary: str | None,
    old_history: list[ConversationTurn],
) -> str | None:
    if provided_summary and provided_summary.strip():
        return _clip_block(provided_summary, CHAT_SUMMARY_MAX_CHARS)
    return _build_extract_summary_from_old_history(old_history)


def _build_teacher_directive_block(
    conversation_history: list[ConversationTurn],
) -> str | None:
    """
    선생님/시스템 개입은 학생에게 보인 발화가 아니라 AI의 다음 응답 정책입니다.
    일반 대화 턴보다 높은 우선순위의 별도 지침으로 다시 주입해 반영력을 높입니다.
    """
    if CHAT_TEACHER_DIRECTIVE_MAX_ITEMS <= 0:
        return None

    directives: list[str] = []
    for turn in conversation_history:
        if not _is_teacher_memory_turn(turn):
            continue

        text = _clip_text(turn.text, 260)
        if not text:
            continue

        label = speaker_label(turn.sender_type, student_name=turn.student_name)
        directives.append(f"- {label}: {text}")

    if not directives:
        return None

    latest_directives = directives[-CHAT_TEACHER_DIRECTIVE_MAX_ITEMS:]
    return _clip_block("\n".join(latest_directives), CHAT_TEACHER_DIRECTIVE_MAX_CHARS)


def _remove_foreign_text(text: str) -> str:
    cleaned = FOREIGN_TOKEN_PATTERN.sub("", text)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r" +([,.!?;:])", r"\1", cleaned)
    return cleaned


async def _translate_foreign_text(client: AsyncOpenAI, text: str) -> str:
    """한국어/영어 범위를 벗어난 짧은 텍스트를 문맥에 맞게 자연스러운 한글로 변환합니다."""
    prompt = f"""아래 텍스트에 포함된 한국어/영어가 아닌 표기를 문맥에 맞는 자연스러운 한국어(한글) 단어나 어구로 변환하세요.
의미와 품사는 그대로 유지하고, 마크다운이나 부연 설명 없이 변환된 텍스트만 출력하세요.
입력 텍스트 끝에 공백이나 기호가 있다면 변환 후에도 동일하게 유지하세요.
영어 예문과 영어 문법 용어는 그대로 둘 수 있습니다.
절대 결과에 한자, 중국어, 일본어, 베트남어, 포르투갈어, 라틴 확장 문자 등 한국어/영어 밖의 문자를 남기지 마십시오.

입력:
{text}
"""
    try:
        response = await client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=50,
        )
        result = response.choices[0].message.content
        if result:
            # LLM이 번역을 시도했으나 여전히 허용 범위 밖 문자가 남아있다면 강제 제거
            if FOREIGN_CHAR_PATTERN.search(result):
                print(f"[WARN] 한글 변환 LLM이 여전히 외국어를 포함함. 강제 제거: {result}")
                return _remove_foreign_text(result)
            return result
    except Exception as e:
        print(f"[WARN] 한글 변환 LLM 호출 실패: {e}")
        
    # 실패 시 원본에서 문제되는 문자만 강제 제거해서 반환 (fallback)
    return _remove_foreign_text(text)

async def stream_chat(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None,
    need_intervention: bool = False,
    conversation_summary: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    학생과의 채팅 응답을 생성하여 스트리밍(AsyncGenerator)으로 반환합니다.
    """
    client = _get_client()
    system_prompt = build_chat_system_prompt(student_profile)

    # 학생 상태 기반 추가 지침은 대화 발화가 아니라 운영 정책이므로 system prompt에 병합합니다.
    if need_intervention:
        system_prompt += """

# 현재 학생 상태에 따른 추가 지도 지침
지금 이 학생은 반복적으로 어려움을 겪고 있습니다.
평소보다 더 친절하고 쉽게 설명하십시오.
단계를 나누거나 구체적인 예시를 사용하십시오.
정답을 바로 알려주기보다 학생이 스스로 생각해볼 수 있도록 유도하십시오.
"""

    # system 역할을 첫 번째 메시지로 명시적으로 분리
    messages = [{"role": "system", "content": system_prompt}]

    # few-shot 예시: AI가 실제 대화 패턴을 '보고' 따라 하도록 삽입 (리허설)
    messages.extend(build_chat_few_shot_messages(student_profile))

    recent_history = _select_recent_chat_history(conversation_history)
    old_history = conversation_history[: max(len(conversation_history) - len(recent_history), 0)]
    memory_summary = _build_chat_memory_summary(conversation_summary, old_history)
    if memory_summary:
        messages.append({
            "role": "user",
            "content": (
                "시스템: 아래는 최근 원문 대화에서 생략된 이전 대화의 압축 메모리입니다. "
                "학생에게 직접 언급하지 말고, 설명 방식과 다음 질문 전략에만 참고하십시오.\n"
                f"{memory_summary}"
            ),
        })

    teacher_directive_block = _build_teacher_directive_block(conversation_history)
    if teacher_directive_block:
        messages.append({
            "role": "system",
            "content": (
                "담당 선생님의 최신 비공개 지도 지침입니다.\n"
                "아래 지침은 학생에게 그대로 말하거나 존재를 언급하지 말고, "
                "다음 답변의 설명 방식, 난이도, 질문 전략에 우선 반영하십시오.\n"
                "여러 지침이 충돌하면 가장 최근 지침을 우선하되, 학생 보호와 사실 정확성을 해치지 마십시오.\n"
                f"{teacher_directive_block}"
            ),
        })

    # 실제 대화 기록 이어 붙이기
    # TEACHER는 학생에게 보인 발화가 아니라 AI용 비공개 지도 방향으로 라벨링합니다. (방향 A)
    for turn in recent_history:
        if _is_teacher_memory_turn(turn):
            continue

        if turn.role == "model":
            messages.append({"role": "assistant", "content": turn.text})
        else:
            labeled_text = format_labeled_message(
                turn.text,
                turn.sender_type,
                student_name=turn.student_name,
            )
            messages.append({"role": "user", "content": labeled_text})

    response = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.6,          # 반복 방지를 위해 온도 약간 상승 (0.4 -> 0.6)
        max_tokens=400,           # 무한 반복 방지용 하드 리밋
        stream=True,
    )

    buffer = ""
    async for chunk in response:
        if not chunk.choices:   # llama 등 일부 모델이 마지막에 빈 chunk를 보냄
            continue
        delta = chunk.choices[0].delta.content
        if not delta:
            continue
            
        buffer += delta
        
        # 스트리밍 지연을 최소화하기 위해 공백이나 개행 문자를 기준으로 단어 단위로 버퍼링합니다.
        # 완성된 단어(공백 이전까지의 텍스트)를 잘라내어 검사합니다.
        match = re.search(r'([\s\S]*[\s\n])([^\s\n]*)$', buffer)
        if match:
            completed_text = match.group(1)
            buffer = match.group(2)
            
            if FOREIGN_CHAR_PATTERN.search(completed_text):
                completed_text = await _translate_foreign_text(client, completed_text)
                
            yield completed_text

    # 남은 버퍼 처리
    if buffer:
        if FOREIGN_CHAR_PATTERN.search(buffer):
            buffer = await _translate_foreign_text(client, buffer)
        yield buffer


async def analyze_student(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None,
    previous_summary: RealtimeAnalysis | None = None,
) -> RealtimeAnalysis:
    """
    전체 대화 기록을 기반으로 학생의 현재 상태를 분석하여 RealtimeAnalysis JSON 데이터를 반환합니다.
    previous_summary가 제공되면 직전 분석 수치를 User Prompt에 주입하여
    struggle_delta 등 상대적 변화량 계산의 정확도를 높입니다.
    """
    # ── 대화 기록을 이전 맥락 / 마지막 턴으로 분리 ────────────────────────────
    # 마지막 턴 = 마지막 AI 발화 + 마지막 학생 발화 (최대 최근 2개)

    # ── User Prompt 구성 (3구역 분리) ────────────────────────────────────────
    MAX_CONTEXT_TURNS = 4
    MAX_TURN_CHARS = 500

    def _is_student_turn(turn: ConversationTurn) -> bool:
        if turn.role == "model":
            return False
        sender_type = (turn.sender_type or "").upper()
        return sender_type == "STUDENT"

    # 마지막 학생 발화를 기준으로 마지막 상호작용 구성
    # 선생님 지시는 백그라운드 지도 방향이므로 분석 대상 학생 발화로 잡지 않습니다.
    last_student_idx = None
    for i in range(len(conversation_history) - 1, -1, -1):
        if _is_student_turn(conversation_history[i]):
            last_student_idx = i
            break

    if last_student_idx is None:
        return RealtimeAnalysis(
            understanding_score=None,
            current_topic="학생 발화 없음",
            student_emotion="중립",
            one_line_summary="분석할 학생 발화 없음",
            need_intervention=False,
        )
    else:
        start_idx = max(0, last_student_idx - 1)
        last_turns = conversation_history[start_idx:last_student_idx + 1]

        context_start = max(0, start_idx - MAX_CONTEXT_TURNS)
        context_turns = conversation_history[context_start:start_idx]

    client = _get_client()
    system_prompt = build_realtime_analysis_system_prompt(student_profile)


    def _truncate(text: str, max_chars: int = MAX_TURN_CHARS) -> str:
        text = text.strip()
        return text if len(text) <= max_chars else text[:max_chars] + "..."


    def _format_turns(turns: list[ConversationTurn]) -> str:
        lines = []
        for turn in turns:
            if turn.role == "model":
                speaker = "AI 선생님"
            else:
                speaker = speaker_label(
                    turn.sender_type,
                    student_name=turn.student_name,
                )
            lines.append(f"{speaker}: {_truncate(turn.text)}")
        return "\n".join(lines) + "\n"

    def _previous_model_turn(index: int) -> ConversationTurn | None:
        for prev_index in range(index - 1, -1, -1):
            turn = conversation_history[prev_index]
            if turn.role == "model":
                return turn
            if _is_student_turn(turn):
                break
        return None

    def _previous_ai_question_type(turn: ConversationTurn | None) -> str:
        if not turn:
            return "none"

        text = turn.text.strip().lower()
        if not text:
            return "none"

        yes_no_markers = (
            "맞지",
            "맞니",
            "맞나요",
            "이해됐",
            "알겠",
            "괜찮",
            "해볼래",
            "해볼까",
            "볼래",
            "볼까",
            "준비됐",
            "되겠",
            "되나요",
            "있을까",
            "있나요",
        )
        choice_markers = (
            "둘 중",
            "어느 쪽",
            "어떤 것",
            "무엇",
            "뭐가",
            "뭐를",
            "어디",
            "주격",
            "목적격",
            "a와 b",
            "a or b",
            "1번",
            "2번",
            "골라",
            "선택",
        )
        explanation_markers = (
            "설명해",
            "말해볼",
            "왜",
            "이유",
            "네 말로",
            "정리해",
            "요약해",
        )

        if any(marker in text for marker in explanation_markers):
            return "explanation"
        if any(marker in text for marker in choice_markers):
            return "choice"
        if any(marker in text for marker in yes_no_markers):
            return "yes_no"
        if "?" in text or text.endswith(("까", "니", "나요", "래")):
            return "question"
        return "statement"

    def _is_short_answer_to_previous_question(text: str, question_type: str) -> bool:
        normalized = " ".join(text.strip().lower().split())
        if not normalized:
            return False

        tokens = normalized.split()
        compact = normalized.replace(" ", "")
        affirmative_answers = {"네", "예", "응", "어", "맞아요", "맞아", "아니요", "아니", "아뇨"}
        choice_answers = {
            "주격",
            "목적격",
            "주어",
            "목적어",
            "관계대명사",
            "which",
            "who",
            "that",
            "whom",
            "1번",
            "2번",
            "a",
            "b",
        }

        if question_type == "yes_no":
            return compact in affirmative_answers

        if question_type == "choice":
            return (
                compact in choice_answers
                or any(answer in compact for answer in choice_answers)
                or len(tokens) <= 2
            )

        if question_type == "question":
            return len(tokens) <= 2 and compact not in {"음", "ㅇ", "ㅋㅋ"}

        return False

    def _is_nonresponsive_student_turn(turn: ConversationTurn, previous_ai_turn: ConversationTurn | None = None) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip()
        if text in {"", ".", "..", "...", "음", "ㅇ", "ㅋㅋ"}:
            return True

        question_type = _previous_ai_question_type(previous_ai_turn)
        if _is_short_answer_to_previous_question(text, question_type):
            return False

        return text in {"네", "어"} or len(text) <= 2

    def _normalize_for_signal_match(text: str) -> str:
        return re.sub(r"[^0-9a-zA-Z가-힣]+", "", text.lower())

    def _max_window_similarity(text: str, phrase: str) -> float:
        text_len = len(text)
        phrase_len = len(phrase)
        if text_len == 0 or phrase_len == 0:
            return 0.0
        if text_len <= phrase_len + 2:
            return SequenceMatcher(None, text, phrase).ratio()

        best = 0.0
        min_size = max(2, phrase_len - 2)
        max_size = min(text_len, phrase_len + 2)
        for size in range(min_size, max_size + 1):
            for start in range(0, text_len - size + 1):
                score = SequenceMatcher(None, text[start:start + size], phrase).ratio()
                if score > best:
                    best = score
                    if best >= 0.92:
                        return best
        return best

    def _has_signal_match(text: str, phrases: tuple[str, ...], threshold: float = 0.82) -> bool:
        normalized_text = _normalize_for_signal_match(text)
        if not normalized_text:
            return False

        for phrase in phrases:
            normalized_phrase = _normalize_for_signal_match(phrase)
            if not normalized_phrase:
                continue
            if normalized_phrase in normalized_text:
                return True
            if len(normalized_phrase) < 4:
                continue
            if _max_window_similarity(normalized_text, normalized_phrase) >= threshold:
                return True
        return False

    def _is_offtask_or_refusal_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip().lower()
        if not text:
            return False

        temporary_requests = ("화장실", "잠시만", "물 마시", "쉬는 시간")
        if _has_signal_match(text, temporary_requests, threshold=0.84):
            return False

        refusal_keywords = (
            "싫어",
            "안 할",
            "안할",
            "하기 싫",
            "못 하겠",
            "못하겠",
            "그만",
            "그만할래",
            "그만하고 싶",
            "포기",
            "공부 싫",
            "수업 싫",
            "수업 안",
            "안 하고 싶",
            "안하고 싶",
            "안 할래",
            "안할래",
            "나갈래",
            "나가고",
            "집에 갈",
            "집 가고 싶",
            "못 듣겠",
            "집중 안",
        )
        offtask_keywords = (
            "게임",
            "급식",
            "유튜브",
            "노래",
            "아이돌",
            "축구",
            "웹툰",
            "딴 얘기",
            "다른 얘기",
            "상관없는",
            "수업 말고",
            "공부 말고",
            "딴 거",
            "재밌는 얘기",
        )
        return _has_signal_match(text, refusal_keywords + offtask_keywords)

    def _is_self_blame_or_helpless_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip().lower()
        if not text:
            return False

        helpless_keywords = (
            "머리가 없",
            "재능이 없",
            "재능 없",
            "나는 못",
            "난 못",
            "저는 못",
            "전 못",
            "아무리 해도 안",
            "계속 틀",
            "맨날 틀",
            "항상 틀",
            "해도 안 돼",
            "해도 안되",
            "해도 안돼",
            "안 되는 것 같",
            "안되는 것 같",
            "못하겠",
            "못 하겠",
            "포기하고 싶",
            "너무 못",
            "진짜 못",
            "아예 못",
            "절대 못",
            "답이 없",
            "가망이 없",
            "소용없",
            "해봤자",
            "또 틀",
            "난 안 돼",
            "난 안되",
            "저는 안 돼",
            "저는 안되",
            "자신 없어",
            "자신없",
            "망했",
            "멘탈",
            "머리가 안 돌아",
            "머리 안 돌아",
        )
        return _has_signal_match(text, helpless_keywords)

    def _is_confusion_or_stuck_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip().lower()
        if not text:
            return False

        stuck_keywords = (
            "모르겠",
            "헷갈",
            "이해가 안",
            "이해 안",
            "이해를 못",
            "구분이 안",
            "구분 안",
            "어려워",
            "어렵",
            "막혔",
            "막혀",
            "무슨 뜻",
            "뭔지 모르",
            "뭐가 다른",
            "감이 안",
            "감 안",
            "감이 안 잡",
            "감 안 잡",
            "머릿속이 복잡",
            "머리가 복잡",
            "머릿속이 엉켜",
            "엉켜",
            "정리가 안",
            "정리 안",
            "따라가기 힘들",
            "못 따라가",
            "뭔 말인지",
            "무슨 말인지",
            "어디서부터",
            "뭘 해야",
            "어떻게 해야",
            "막막",
            "어디가 틀",
            "왜 틀",
            "왜 안",
            "잘 안 돼",
            "잘 안되",
            "안 풀",
            "부족",
        )
        return _has_signal_match(text, stuck_keywords)

    def _has_clear_misconception_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip().lower()
        if not text:
            return False

        misconception_patterns = (
            ("다시 써야", ("it", "him", "her", "대명사")),
            ("또 써야", ("it", "him", "her", "대명사")),
            ("써야 뜻이", ("it", "him", "her", "대명사")),
            ("쓰면 뜻", ("it", "him", "her", "대명사")),
            ("더 분명", ("it", "him", "her", "대명사")),
            ("있어야", ("it", "him", "her", "대명사")),
            ("넣고 싶", ("it", "him", "her", "대명사")),
            ("넣게", ("it", "him", "her", "대명사")),
            ("써도 돼", ("it", "him", "her", "대명사")),
            ("써도 되", ("it", "him", "her", "대명사")),
            ("목적어가 두 번", ("맞", "괜찮", "가능")),
        )
        return any(
            phrase in text and any(marker in text for marker in markers)
            for phrase, markers in misconception_patterns
        )

    recent_student_turns_with_context = [
        (index, turn, _previous_model_turn(index))
        for index, turn in enumerate(conversation_history)
        if _is_student_turn(turn)
    ][-3:]
    recent_student_turns = [turn for _, turn, _ in recent_student_turns_with_context]
    recent_nonresponsive_count = sum(
        1 for _, turn, previous_ai_turn in recent_student_turns_with_context
        if _is_nonresponsive_student_turn(turn, previous_ai_turn)
    )
    recent_offtask_or_refusal_count = sum(
        1 for turn in recent_student_turns
        if _is_offtask_or_refusal_student_turn(turn)
    )
    recent_self_blame_or_helpless_count = sum(
        1 for turn in recent_student_turns
        if _is_self_blame_or_helpless_student_turn(turn)
    )
    recent_confusion_or_stuck_count = sum(
        1 for turn in recent_student_turns
        if _is_confusion_or_stuck_student_turn(turn)
    )
    recent_clear_misconception_count = sum(
        1 for turn in recent_student_turns
        if _has_clear_misconception_student_turn(turn)
    )
    last_student_turn = recent_student_turns[-1] if recent_student_turns else None
    last_student_text = last_student_turn.text.strip() if last_student_turn else ""
    last_student_has_clear_misconception = (
        _has_clear_misconception_student_turn(last_student_turn)
        if last_student_turn
        else False
    )
    last_student_is_self_blame_or_helpless = (
        _is_self_blame_or_helpless_student_turn(last_student_turn)
        if last_student_turn
        else False
    )

    user_content = ""

    if context_turns:
        user_content += (
            "[최근 이전 대화 맥락 — 참고용]\n"
            "아래 내용은 흐름 파악용이며, 분석 대상은 아닙니다.\n"
            f"{_format_turns(context_turns)}\n"
        )

    if previous_summary:
        user_content += (
            "[직전 턴 분석 결과 — 연속성 참고용]\n"
            f"- previous_understanding_score: {previous_summary.understanding_score}\n"
            f"- previous_student_emotion: {previous_summary.student_emotion}\n"
            f"- previous_current_topic: {previous_summary.current_topic}\n"
            f"- previous_one_line_summary: {previous_summary.one_line_summary}\n"
            "\n"
        )
    else:
        user_content += (
            "[직전 턴 분석 결과]\n"
            "- 없음 (이번이 첫 분석이거나 기록이 없습니다.)\n"
            "\n"
        )

    user_content += (
        "[관측 보조 신호]\n"
        f"- recent_nonresponsive_student_turn_count: {recent_nonresponsive_count}\n"
        "- 이 값이 2 이상이면 최근 학생 무반응이 반복된 상태입니다.\n"
        f"- recent_offtask_or_refusal_student_turn_count: {recent_offtask_or_refusal_count}\n"
        "- 이 값이 2 이상이면 최근 학생이 수업 외 주제로 반복 이탈하거나 수업을 거부한 상태입니다.\n"
        f"- recent_self_blame_or_helpless_student_turn_count: {recent_self_blame_or_helpless_count}\n"
        "- 이 값이 1 이상이면 학생이 강한 자책이나 학습 무력감을 표현한 상태입니다.\n"
        f"- recent_confusion_or_stuck_student_turn_count: {recent_confusion_or_stuck_count}\n"
        "- 이 값이 2 이상이면 최근 같은 흐름에서 혼란이나 막힘이 반복된 상태입니다.\n"
        "\n"
    )

    user_content += (
        "[★ 지금 분석할 마지막 상호작용]\n"
        "AI 선생님 발화는 학생 반응 해석을 위한 맥락입니다.\n"
        "선생님 지시는 AI용 비공개 지도 방향이며 학생 발화가 아닙니다.\n"
        "분석 대상은 마지막 학생 발화입니다.\n"
        f"{_format_turns(last_turns)}\n"
    )

    user_content += (
        "\n[출력 지시]\n"
        "- 위 마지막 학생 발화에 나타난 상태만 분석하세요.\n"
        "- 최근 이전 대화는 흐름 파악에만 사용하세요.\n"
        "- 선생님 지시는 학생 이해도, 감정, 개입 필요 여부의 직접 근거로 사용하지 마세요.\n"
        "- JSON만 출력하세요. 설명, 마크다운, 코드블록은 금지입니다.\n"
        "- 마지막 학생 발화가 짧고 모호하면 understanding_score=null로 두세요.\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response = None
    retry_delays = (2.0, 5.0, 10.0)
    for attempt in range(len(retry_delays) + 1):
        try:
            response = await client.chat.completions.create(
                model=ANALYZE_MODEL,
                messages=messages,
                temperature=0,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            break
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            if attempt >= len(retry_delays):
                raise
            delay = retry_delays[attempt]
            print(f"[WARN] 분석 LLM 호출 재시도 예정 ({attempt + 1}/{len(retry_delays)}): {type(e).__name__}, {delay}s 대기")
            await asyncio.sleep(delay)

    if response is None:
        raise RuntimeError("분석 LLM 호출 응답이 없습니다.")

    raw_text = response.choices[0].message.content
    finish_reason = response.choices[0].finish_reason
    if not raw_text:
        print(f"[WARN] 분석 모델 응답이 비어있습니다. (finish_reason={finish_reason}, 안전 필터 또는 API 오류)")
        return RealtimeAnalysis(
            understanding_score=None,
            current_topic=None,
            student_emotion="중립",
            one_line_summary="분석 불가 (안전 필터)",
            need_intervention=False,
        )

    # 순수 JSON 추출 (마크다운 포맷팅 방어)
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()
    raw_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw_text)
    def _escape_in_string(m: re.Match) -> str:
        return m.group(0).replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
    raw_text = re.sub(r'"(?:[^"\\]|\\.)*"', _escape_in_string, raw_text, flags=re.DOTALL)
    raw_text = re.sub(r'//.*', '', raw_text)

    def _parse_analysis_json(text: str) -> dict:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        text = re.sub(r'"(?:[^"\\]|\\.)*"', _escape_in_string, text, flags=re.DOTALL)
        text = re.sub(r'//.*', '', text)

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            text = text[start:end + 1]

        return json.loads(text)

    async def _retry_analysis_json() -> dict:
        retry_messages = messages + [
            {
                "role": "user",
                "content": (
                    "이전 응답이 유효한 JSON이 아니었습니다. "
                    "같은 분석을 다시 수행하되, 반드시 완전한 JSON 객체 하나만 출력하세요. "
                    "줄임표, 코드블록, 설명문은 금지입니다."
                ),
            }
        ]
        retry_response = await client.chat.completions.create(
            model=ANALYZE_MODEL,
            messages=retry_messages,
            temperature=0,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        retry_text = retry_response.choices[0].message.content or ""
        return _parse_analysis_json(retry_text)

    def _fallback_analysis_data() -> dict:
        topic = "관계대명사의 주격과 목적격 구분"
        if last_student_has_clear_misconception:
            return {
                "understanding_score": 3,
                "current_topic": "목적격 관계대명사 뒤 대명사 반복 금지",
                "student_emotion": "혼란",
                "one_line_summary": "관계대명사 뒤 대명사 중복 사용을 혼동함",
                "need_intervention": False,
            }
        if recent_nonresponsive_count >= 2:
            return {
                "understanding_score": None,
                "current_topic": "응답 없음",
                "student_emotion": "무반응",
                "one_line_summary": "단답과 무반응이 반복됨",
                "need_intervention": True,
            }
        if recent_self_blame_or_helpless_count >= 1:
            return {
                "understanding_score": None,
                "current_topic": topic,
                "student_emotion": "좌절",
                "one_line_summary": "강한 자책과 학습 무력감을 표현함",
                "need_intervention": True,
            }
        if recent_confusion_or_stuck_count >= 2:
            return {
                "understanding_score": 4,
                "current_topic": topic,
                "student_emotion": "혼란",
                "one_line_summary": "같은 개념에서 반복적으로 막힘",
                "need_intervention": True,
            }
        if recent_confusion_or_stuck_count == 1:
            return {
                "understanding_score": 5,
                "current_topic": topic,
                "student_emotion": "혼란",
                "one_line_summary": "개념 이해에 혼란을 표현함",
                "need_intervention": False,
            }
        return {
            "understanding_score": None,
            "current_topic": topic,
            "student_emotion": "중립",
            "one_line_summary": "분석 응답 파싱 실패",
            "need_intervention": False,
        }

    try:
        data = _parse_analysis_json(raw_text)
    except json.JSONDecodeError as e:
        print(
            "[WARN] 분석 JSON 1차 파싱 실패. 재요청 시도 "
            f"error={e}, raw_preview={raw_text[:120]}"
        )
        try:
            data = await _retry_analysis_json()
        except Exception as retry_error:
            print(
                "[ERROR] 분석 JSON 재요청도 실패. 휴리스틱 fallback 사용 "
                f"error={retry_error}, raw_preview={raw_text[:120]}"
            )
            data = _fallback_analysis_data()

    try:
        if recent_nonresponsive_count >= 2:
            data["understanding_score"] = None
            data["current_topic"] = "응답 없음"
            data["student_emotion"] = "무반응"
            data["need_intervention"] = True
        elif recent_offtask_or_refusal_count >= 2:
            data["understanding_score"] = None
            data["current_topic"] = "수업 외 대화"
            if data.get("student_emotion") in {None, "중립", "집중", "흥미", "자신감"}:
                data["student_emotion"] = "지루함"
            data["one_line_summary"] = "수업 외 주제로 반복 이탈함"
            data["need_intervention"] = True
        elif last_student_is_self_blame_or_helpless:
            if data.get("student_emotion") in {None, "중립", "집중", "흥미", "자신감", "혼란"}:
                data["student_emotion"] = "좌절"
            if data.get("current_topic") == "수업 외 대화":
                data["current_topic"] = "학습 무력감"
            data["one_line_summary"] = "강한 자책과 학습 무력감을 표현함"
            data["need_intervention"] = True
        elif recent_confusion_or_stuck_count >= 2:
            if data.get("student_emotion") in {None, "중립", "집중", "흥미", "자신감"}:
                data["student_emotion"] = "혼란"
            data["one_line_summary"] = "같은 개념에서 반복적으로 막힘"
            data["need_intervention"] = True
        elif last_student_has_clear_misconception:
            if data.get("student_emotion") in {None, "자신감", "흥미", "집중"}:
                data["student_emotion"] = "혼란"
            if recent_clear_misconception_count >= 2 or recent_confusion_or_stuck_count >= 2:
                data["need_intervention"] = True
            else:
                data["need_intervention"] = False
        elif data.get("current_topic") == "수업 외 대화" and len(last_student_text) > 2:
            data["understanding_score"] = None
            if data.get("student_emotion") == "무반응":
                data["student_emotion"] = "중립"
            data["need_intervention"] = False
        elif (
            data.get("need_intervention") is True
            and recent_nonresponsive_count < 2
            and data.get("student_emotion") in {"혼란", "집중", "중립", "자신감", "흥미"}
        ):
            data["need_intervention"] = False
        return RealtimeAnalysis(**data)
    except (TypeError, ValueError) as e:
        error_msg = f"LLM 분석 응답 스키마가 올바르지 않습니다: {e}\nRaw Response: {raw_text}"
        print(f"[ERROR] {error_msg}")
        raise ValueError(error_msg)
