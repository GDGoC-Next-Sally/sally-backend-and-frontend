"""
services/llm_service.py — LLM API 호출 및 TEACHER_SUMMARY 파싱
JS의 callGeminiAPI() 함수를 파이썬으로 이식합니다.
"""
import re
import json
import os
import asyncio
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

# ── 모델 설정 (채팅용 / 분석용 분리) ──────────────────────────────────────────
CHAT_MODEL = "meta/llama-3.3-70b-instruct"         # 채팅용: 성능이 뛰어난 70B 모델
#ANALYZE_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5"  # 분석용: 추론 능력이 뛰어난 무거운 모델
ANALYZE_MODEL = "meta/llama-3.3-70b-instruct"
#ANALYZE_MODEL = "nvidia/llama-3.1-nemotron-nano-8b-v1"     # 8B: 너무 단순하여 분석 정확도 낮음

# 한자(중국어 포함) 및 일본어(히라가나, 가타카나) 강제 필터링 정규식
FOREIGN_CHAR_PATTERN = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]")

def _get_client() -> AsyncOpenAI:
    """API Key를 런타임에 읽어서 클라이언트를 생성합니다 (lazy init)."""
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
        timeout=120.0,  # 대형 모델의 긴 TTFT(첫 토큰 대기)를 위해 120초로 설정
    )

async def _translate_foreign_text(client: AsyncOpenAI, text: str) -> str:
    """한자나 일본어가 포함된 짧은 텍스트(단어/어구)를 문맥에 맞게 자연스러운 한글로 변환합니다."""
    prompt = f"""아래 텍스트에 포함된 한자(중국어) 및 일본어 표기를 문맥에 맞는 자연스러운 한국어(한글) 단어나 어구로 변환하세요.
의미와 품사는 그대로 유지하고, 마크다운이나 부연 설명 없이 변환된 텍스트만 출력하세요.
입력 텍스트 끝에 공백이나 기호가 있다면 변환 후에도 동일하게 유지하세요.
절대 결과에 한자, 중국어, 일본어 문자를 남기지 마십시오.

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
            # LLM이 번역을 시도했으나 여전히 외국어가 남아있다면 강제 제거
            if FOREIGN_CHAR_PATTERN.search(result):
                print(f"[WARN] 한글 변환 LLM이 여전히 외국어를 포함함. 강제 제거: {result}")
                return FOREIGN_CHAR_PATTERN.sub("", result)
            return result
    except Exception as e:
        print(f"[WARN] 한글 변환 LLM 호출 실패: {e}")
        
    # 실패 시 원본에서 문제되는 문자만 강제 제거해서 반환 (fallback)
    return FOREIGN_CHAR_PATTERN.sub("", text)

async def stream_chat(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None,
    need_intervention: bool = False,
) -> AsyncGenerator[str, None]:
    """
    학생과의 채팅 응답을 생성하여 스트리밍(AsyncGenerator)으로 반환합니다.
    """
    client = _get_client()
    system_prompt = build_chat_system_prompt(student_profile)

    # system 역할을 첫 번째 메시지로 명시적으로 분리
    messages = [{"role": "system", "content": system_prompt}]

    # few-shot 예시: AI가 실제 대화 패턴을 '보고' 따라 하도록 삽입 (리허설)
    messages.extend(build_chat_few_shot_messages(student_profile))

    # [방향 B] 방향 B: 시스템이 개입 필요 신호를 보낸 경우, 대화 기록 전에 자동 지시 삽입
    # need_intervention=True이면 교사 메시지 없이도 AI가 자동으로 "배려 모드"로 전환합니다.
    if need_intervention:
        messages.append({
            "role": "user",
            "content": (
                "시스템: 지금 이 학생은 반복적으로 어려움을 겪고 있습니다. "
                "지금보다 더 친절하고 쉽게 설명해 주세요. "
                "단계를 나누거나 구체적인 예시를 들어 주세요. "
                "정답을 바로 알려주기보다 학생이 스스로 생각해볼 수 있도록 유도해 주세요."
            )
        })

    # 실제 대화 기록 이어 붙이기
    # TEACHER는 학생에게 보인 발화가 아니라 AI용 비공개 지도 방향으로 라벨링합니다. (방향 A)
    for turn in conversation_history:
        if turn.role == "model":
            messages.append({"role": "assistant", "content": turn.text})
        else:
            labeled_text = format_labeled_message(
                turn.text,
                turn.sender_type,
                student_name=turn.student_name,
                sender_name=turn.sender_name,
                speaker_name=turn.speaker_name,
            )
            messages.append({"role": "user", "content": labeled_text})

    response = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.6,          # 반복 방지를 위해 온도 약간 상승 (0.4 -> 0.6)
        presence_penalty=0.2,     # 새로운 주제를 말하도록 유도
        frequency_penalty=0.4,    # 똑같은 단어/구조 반복 억제
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
    MAX_CONTEXT_TURNS = 6
    MAX_TURN_CHARS = 500

    def _is_student_turn(turn: ConversationTurn) -> bool:
        if turn.role == "model":
            return False
        sender_type = (turn.sender_type or "STUDENT").upper()
        return sender_type in {"STUDENT", "USER", "LEARNER", "HUMAN"}

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
                    sender_name=turn.sender_name,
                    speaker_name=turn.speaker_name,
                )
            lines.append(f"{speaker}: {_truncate(turn.text)}")
        return "\n".join(lines) + "\n"

    def _is_nonresponsive_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip()
        return text in {"", ".", "..", "...", "네", "음", "ㅇ", "ㅋㅋ"} or len(text) <= 2

    def _is_offtask_or_refusal_student_turn(turn: ConversationTurn) -> bool:
        if not _is_student_turn(turn):
            return False

        text = turn.text.strip().lower()
        if not text:
            return False

        temporary_requests = ("화장실", "잠시만", "물 마시", "쉬는 시간")
        if any(keyword in text for keyword in temporary_requests):
            return False

        refusal_keywords = (
            "싫어",
            "안 할",
            "안할",
            "못 하겠",
            "못하겠",
            "그만",
            "포기",
            "하기 싫",
            "공부 싫",
            "수업 싫",
            "수업 안",
            "나갈래",
            "나가고",
            "집에 갈",
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
        )
        return any(keyword in text for keyword in refusal_keywords + offtask_keywords)

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
        )
        return any(keyword in text for keyword in helpless_keywords)

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
            "구분이 안",
            "구분 안",
            "어려워",
            "어렵",
            "막혔",
            "막혀",
            "무슨 뜻",
            "뭔지 모르",
            "뭐가 다른",
        )
        return any(keyword in text for keyword in stuck_keywords)

    def _has_relative_pronoun_misconception(text: str) -> bool:
        normalized = text.strip().lower()
        if not normalized:
            return False

        connector_only = (
            "접속사" in normalized
            and not any(keyword in normalized for keyword in ("대명사 역할", "목적어 역할", "주어 역할"))
        )
        repeats_object_pronoun = (
            any(keyword in normalized for keyword in ("it을 또", "it을 다시", "it도", "it이 또", "it이 다시"))
            and any(keyword in normalized for keyword in ("써야", "필요", "완전"))
        )
        role_reversal = (
            "목적어가 빠졌" in normalized
            and "주격" in normalized
        ) or (
            "주어가 빠졌" in normalized
            and "목적격" in normalized
        )
        return connector_only or repeats_object_pronoun or role_reversal

    def _has_clear_relative_pronoun_understanding(text: str) -> bool:
        normalized = text.strip().lower()
        if not normalized:
            return False

        role_understanding = any(keyword in normalized for keyword in ("목적어 역할", "주어 역할", "it 역할"))
        no_duplicate_pronoun = any(
            keyword in normalized
            for keyword in ("it을 다시 쓰면 안", "it을 또 쓰면 안", "it을 쓰면 안", "중복")
        )
        object_omission = "목적격" in normalized and any(keyword in normalized for keyword in ("생략", "빼도"))
        return role_understanding and (no_duplicate_pronoun or object_omission)

    recent_student_turns = [
        turn for turn in conversation_history
        if _is_student_turn(turn)
    ][-3:]
    recent_nonresponsive_count = sum(
        1 for turn in recent_student_turns
        if _is_nonresponsive_student_turn(turn)
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
    last_student_turn = recent_student_turns[-1] if recent_student_turns else None
    last_student_text = last_student_turn.text.strip() if last_student_turn else ""
    has_relative_pronoun_misconception = _has_relative_pronoun_misconception(last_student_text)
    has_clear_relative_pronoun_understanding = _has_clear_relative_pronoun_understanding(last_student_text)

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
        f"- has_relative_pronoun_misconception_in_last_student_turn: {has_relative_pronoun_misconception}\n"
        "- 이 값이 true이면 마지막 학생 발화에 관계대명사를 접속사로만 보거나 목적격 뒤 대명사를 반복해야 한다는 명확한 오개념이 있습니다.\n"
        f"- has_clear_relative_pronoun_understanding_in_last_student_turn: {has_clear_relative_pronoun_understanding}\n"
        "- 이 값이 true이면 마지막 학생 발화가 관계대명사의 문장 성분 역할과 대명사 중복 금지 또는 목적격 생략을 정확히 설명한 상태입니다.\n"
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
                max_tokens=512,
                presence_penalty=0,
                frequency_penalty=0,
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

    try:
        data = json.loads(raw_text)
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
        elif recent_self_blame_or_helpless_count >= 1:
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
        elif has_relative_pronoun_misconception:
            score = data.get("understanding_score")
            if score is None or score > 4:
                data["understanding_score"] = 3
            if data.get("student_emotion") in {None, "중립", "집중", "흥미"}:
                data["student_emotion"] = "혼란"
            data["current_topic"] = "관계대명사의 역할 이해"
            data["one_line_summary"] = "관계대명사 역할을 오해함"
            data["need_intervention"] = False
        elif has_clear_relative_pronoun_understanding:
            score = data.get("understanding_score")
            if score is None or score < 8:
                data["understanding_score"] = 8
            if data.get("student_emotion") in {None, "중립", "혼란"}:
                data["student_emotion"] = "집중"
            data["current_topic"] = "관계대명사의 역할 이해"
            data["one_line_summary"] = "관계대명사 역할을 정확히 설명함"
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
    except json.JSONDecodeError as e:
        error_msg = f"LLM 분석 응답을 JSON으로 파싱할 수 없습니다: {e}\nRaw Response: {raw_text}"
        print(f"[ERROR] {error_msg}")
        raise ValueError(error_msg)
