"""
services/llm_service.py — LLM API 호출 및 TEACHER_SUMMARY 파싱
JS의 callGeminiAPI() 함수를 파이썬으로 이식합니다.
"""
import re
import json
import os
from pathlib import Path
from openai import AsyncOpenAI
from dotenv import load_dotenv

from typing import AsyncGenerator
from ai_server.models import StudentProfile, ConversationTurn, TeacherSummary, RealtimeAnalysis
from ai_server.services.prompt_builder import build_chat_system_prompt, build_realtime_analysis_system_prompt, build_chat_few_shot_messages

# ai_server 폴더 안의 .env 파일을 명시적으로 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# ── 모델 설정 (채팅용 / 분석용 분리) ──────────────────────────────────────────
CHAT_MODEL = "meta/llama-3.3-70b-instruct"         # 채팅용: 성능이 뛰어난 70B 모델
#ANALYZE_MODEL = "nvidia/llama-3.3-nemotron-super-49b-v1.5"  # 분석용: 추론 능력이 뛰어난 무거운 모델
ANALYZE_MODEL = "meta/llama-3.3-70b-instruct"
#ANALYZE_MODEL = "nvidia/llama-3.1-nemotron-nano-8b-v1"     # 8B: 너무 단순하여 분석 정확도 낮음


# ── 분석 파이프라인 상수 ─────────────────────────────────────────────────────
EMA_ALPHA = 0.4               # understanding_score EMA 가중치 (현재 턴 반영 비율)
SHORT_RESPONSE_THRESHOLD = 15  # 짧은 응답 기준 (자)

KEYWORDS_STRUGGLE = [
    "모르겠어요", "모르겠어", "못하겠어요", "못하겠어",
    "그냥 알려줘", "답 알려줘", "어려워요", "어려워",
    "포기", "이해 안돼", "이해가 안",
]
KEYWORDS_UNDERSTANDING = [
    "알겠어요", "알겠어", "이해했어요", "이해했어",
    "아!", "아 맞다", "그렇구나", "맞죠", "됐어요",
]

def _build_heuristic_signals(
    last_turns: list[ConversationTurn],
    conversation_history: list[ConversationTurn],
) -> str:
    """
    마지막 학생 발화에서 자동 감지한 신호를 짧고 구조화된 형태로 반환합니다.
    최종 판단은 LLM이 최근 대화 맥락과 함께 수행하도록, 휴리스틱은 단정적 표현을 피합니다.
    """
    student_turns = [t for t in last_turns if t.role == "user"]
    if not student_turns:
        return ""

    last_text = student_turns[-1].text.strip()
    signals = []

    # 1. 응답 길이
    char_count = len(last_text)
    is_short = char_count <= SHORT_RESPONSE_THRESHOLD
    signals.append(f"- last_student_char_count: {char_count}")
    signals.append(f"- is_short_response: {str(is_short).lower()}")

    if is_short:
        signals.append("- short_response_note: 짧은 응답은 단독으로 무관심/혼란으로 단정하지 말고 키워드와 맥락을 함께 보세요.")

    # 2. 키워드 감지
    found_struggle = [kw for kw in KEYWORDS_STRUGGLE if kw in last_text]
    found_understanding = [kw for kw in KEYWORDS_UNDERSTANDING if kw in last_text]

    if found_struggle:
        signals.append(f"- struggle_keywords_found: {found_struggle}")
    else:
        signals.append("- struggle_keywords_found: []")

    if found_understanding:
        signals.append(f"- understanding_keywords_found: {found_understanding}")
    else:
        signals.append("- understanding_keywords_found: []")

    if found_struggle and found_understanding:
        signals.append("- mixed_signal: true")
        signals.append("- mixed_signal_note: 부정/혼란 표현과 이해 표현이 함께 있으므로 confusion_resolving 가능성을 검토하세요.")
    else:
        signals.append("- mixed_signal: false")

    # 3. 예시/재설명/질문 요청 감지
    example_request_keywords = ["예시", "예문", "하나 더", "한 번 더", "다른 예", "다른 예시"]
    clarification_keywords = ["왜", "어떻게", "다시", "설명", "모르겠", "헷갈", "어려워"]

    has_example_request = any(kw in last_text for kw in example_request_keywords)
    has_clarification_request = any(kw in last_text for kw in clarification_keywords) or "?" in last_text

    signals.append(f"- has_example_request: {str(has_example_request).lower()}")
    signals.append(f"- has_clarification_request: {str(has_clarification_request).lower()}")

    # 4. 포기/분노 신호 감지
    giving_up_keywords = ["그만", "안 할래", "못하겠", "포기", "하기 싫", "싫어"]
    anger_keywords = ["짜증", "화나", "열받", "빡", "답답"]

    has_giving_up_signal = any(kw in last_text for kw in giving_up_keywords)
    has_anger_signal = any(kw in last_text for kw in anger_keywords)

    signals.append(f"- has_giving_up_signal: {str(has_giving_up_signal).lower()}")
    signals.append(f"- has_anger_signal: {str(has_anger_signal).lower()}")

    # 5. 연속 짧은 응답 횟수
    all_student_turns = [t for t in conversation_history if t.role == "user"]
    consecutive_short = 0

    for t in reversed(all_student_turns):
        if len(t.text.strip()) <= SHORT_RESPONSE_THRESHOLD:
            consecutive_short += 1
        else:
            break

    signals.append(f"- consecutive_short_responses: {consecutive_short}")

    possible_disengagement = (
        consecutive_short >= 2
        and not found_understanding
        and not has_example_request
        and not has_clarification_request
        and not has_giving_up_signal
        and not has_anger_signal
    )

    signals.append(f"- possible_disengagement_pattern: {str(possible_disengagement).lower()}")

    return "[자동 감지된 신호 — 참고용]\n" + "\n".join(signals) + "\n"

def _enforce_consistency(
    summary: TeacherSummary,
    previous_summary: TeacherSummary | None = None,
) -> TeacherSummary:
    """LLM 출력에 규칙 기반 후처리를 적용합니다.
    1) 값 범위 클램핑  2) EMA 스무딩(understanding_score)  3) 필드 간 모순 제거"""
    # ── 1. 범위 클램핑
    summary.struggle_delta = max(-30, min(30, summary.struggle_delta or 0))
    raw_score = max(1, min(10, summary.understanding_score or 5))

    # ── 2. EMA 스무딩 — 이전 점수와 혼합하여 급등락 완화
    if previous_summary and previous_summary.understanding_score:
        prev_score = max(1, min(10, previous_summary.understanding_score))
        smoothed = EMA_ALPHA * raw_score + (1 - EMA_ALPHA) * prev_score
        summary.understanding_score = max(1, min(10, round(smoothed)))
    else:
        summary.understanding_score = raw_score

    # ── 3. 필드 간 모순 제거
    # 규칙 A: confusion_type 없음 → knowledge_gap null 강제
    if summary.confusion_type == "없음":
        summary.knowledge_gap = None
    # 규칙 B: misconception_tag 있으면 confusion_type을 오개념 강제
    if summary.misconception_tag:
        summary.confusion_type = "오개념"
    # 규칙 C: 흥미/집중이면 이탈위험 불가
    if summary.student_emotion in ("흥미", "집중") and summary.engagement_level == "이탈위험":
        summary.engagement_level = "높음"
    # 규칙 D: 이해도 8 이상 → 과도한 좌절 상승 억제
    if summary.understanding_score >= 8 and (summary.struggle_delta or 0) > 10:
        summary.struggle_delta = 10

    return summary


def _process_struggle_metrics(
    summary: TeacherSummary,
    last_turns: list,
    previous_summary: "TeacherSummary | None",
) -> TeacherSummary:
    """
    11단계 파이프라인 기반 frustration 지표 후처리.
    LLM의 raw 출력을 받아 unobservable 처리, 의도 기반 보정,
    confidence 기반 magnitude 조정, adaptive EMA를 순서대로 적용합니다.
    """
    # ── 0. unobservable 처리 ────────────────────────────────────────────────
    if not summary.is_observable:
        summary.struggle_delta = None
        summary.needs_followup_check = True
        summary.reason = summary.reason or "too_short_or_ambiguous"
        # struggle_level은 이전 값 그대로 유지
        if previous_summary and previous_summary.struggle_level is not None:
            summary.struggle_level = previous_summary.struggle_level
        return summary

    # ── 1. struggle_level 범위 클램핑 ────────────────────────────────────
    raw_level = max(0, min(100, summary.struggle_level or 10))

    # ── 2. evidence_type 기반 의도 보정 ─────────────────────────────────────
    evidence = summary.evidence_type or "other"
    if evidence in ("giving_up", "anger"):
        raw_level = min(100, raw_level + 5)   # 강한 부정 신호 → 상승 편향
    elif evidence == "repeated_confusion":
        raw_level = min(100, raw_level + 3)
    elif evidence == "understanding_confirmed":
        raw_level = max(0, raw_level - 5)     # 이해 확인 → 하락 편향
    elif evidence == "confusion_resolving":
        raw_level = max(0, raw_level - 3)
    elif evidence in ("clarification_request", "other"):
        pass                                  # 단순 질문/기타 → 가감점 없음 (+0점 유지)
    elif evidence == "ambiguous_short":
        # 키워드로 2차 판단
        student_turns = [t for t in last_turns if t.role == "user"]
        if student_turns:
            last_text = student_turns[-1].text
            if any(kw in last_text for kw in KEYWORDS_STRUGGLE):
                raw_level = min(100, raw_level + 3)
            elif any(kw in last_text for kw in KEYWORDS_UNDERSTANDING):
                raw_level = max(0, raw_level - 3)

    # ── 3. confidence 기반 magnitude 조정 ───────────────────────────────────
    confidence = summary.confidence or "medium"
    prev_level = (previous_summary.struggle_level or 10) if previous_summary else 10
    raw_delta = raw_level - prev_level

    if confidence == "low":
        raw_delta = raw_delta // 2       # 신뢰도 낮으면 delta 크기 절반으로
    elif confidence == "medium":
        pass                             # 그대로 유지

    # 위험 표현 없는 very low confidence → null 처리
    student_turns_all = [t for t in last_turns if t.role == "user"]
    last_text_all = student_turns_all[-1].text if student_turns_all else ""
    has_danger = any(kw in last_text_all for kw in KEYWORDS_STRUGGLE)
    if confidence == "low" and not has_danger and abs(raw_delta) < 3:
        summary.struggle_delta = None
        summary.struggle_level = prev_level
        summary.needs_followup_check = True
        summary.reason = summary.reason or "low_confidence_no_signal"
        return summary

    # ── 4. 감정 일관성 강제 ─────────────────────────────────────────────────
    emotion = summary.student_emotion or ""
    if emotion in ("흥미", "집중"):
        raw_level = min(raw_level, 35)   # 긍정 감정이면 level 35 상한
    elif emotion in ("좌절", "분노"):
        raw_level = max(raw_level, 55)   # 부정 감정이면 level 55 하한
    elif emotion == "혼란":
        raw_level = max(raw_level, 40)   # 혼란이면 최소 40

    # ── 5. 이해도 연동 상한 ─────────────────────────────────────────────────
    understanding = summary.understanding_score or 5
    if understanding >= 8:
        raw_level = min(raw_level, 40)
    elif understanding >= 6:
        raw_level = min(raw_level, 60)

    # ── 6. Adaptive EMA (위험 신호에 따라 가중치 조정) ──────────────────────
    if previous_summary and previous_summary.struggle_level is not None:
        prev = float(previous_summary.struggle_level)
        if evidence in ("giving_up", "anger"):
            alpha = 0.80   # 위험 신호: 현재 턴 가중치 높임
        elif evidence in ("understanding_confirmed", "confusion_resolving"):
            alpha = 0.55   # 회복 신호: 보수적으로
        else:
            alpha = 0.65   # 일반
        raw_level = round(alpha * raw_level + (1 - alpha) * prev)

    raw_level = max(0, min(100, raw_level))

    # ── 7. delta 계산 및 최종 clipping ──────────────────────────────────────
    final_delta = raw_level - prev_level
    final_delta = max(-30, min(30, round(final_delta)))

    summary.struggle_level = raw_level
    summary.struggle_delta = final_delta

    return summary

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


async def stream_chat(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None
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

    # 실제 학생과의 대화 기록 이어 붙이기
    for turn in conversation_history:
        role = "assistant" if turn.role == "model" else "user"
        messages.append({"role": role, "content": turn.text})

    response = await client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.6,          # 반복 방지를 위해 온도 약간 상승 (0.4 -> 0.6)
        presence_penalty=0.2,     # 새로운 주제를 말하도록 유도
        frequency_penalty=0.4,    # 똑같은 단어/구조 반복 억제
        max_tokens=400,           # 무한 반복 방지용 하드 리밋
        stream=True,
    )

    async for chunk in response:
        if not chunk.choices:   # llama 등 일부 모델이 마지막에 빈 chunk를 보냄
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


async def analyze_student(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None,
    previous_summary: TeacherSummary | None = None,
) -> TeacherSummary:
    """
    전체 대화 기록을 기반으로 학생의 현재 상태를 분석하여 TeacherSummary JSON 데이터를 반환합니다.
    previous_summary가 제공되면 직전 분석 수치를 User Prompt에 주입하여
    struggle_delta 등 상대적 변화량 계산의 정확도를 높입니다.
    """
    client = _get_client()
    system_prompt = build_realtime_analysis_system_prompt(student_profile)


    # ── 대화 기록을 이전 맥락 / 마지막 턴으로 분리 ────────────────────────────
    # 마지막 턴 = 마지막 AI 발화 + 마지막 학생 발화 (최대 최근 2개)

    # ── User Prompt 구성 (3구역 분리) ────────────────────────────────────────
    MAX_CONTEXT_TURNS = 6
    MAX_TURN_CHARS = 500

    # 마지막 학생 발화를 기준으로 마지막 상호작용 구성
    last_student_idx = None
    for i in range(len(conversation_history) - 1, -1, -1):
        if conversation_history[i].role != "model":
            last_student_idx = i
            break

    if last_student_idx is None:
        context_turns = []
        last_turns = conversation_history[-1:]
    else:
        start_idx = max(0, last_student_idx - 1)
        last_turns = conversation_history[start_idx:last_student_idx + 1]

        context_start = max(0, start_idx - MAX_CONTEXT_TURNS)
        context_turns = conversation_history[context_start:start_idx]


    def _truncate(text: str, max_chars: int = MAX_TURN_CHARS) -> str:
        text = text.strip()
        return text if len(text) <= max_chars else text[:max_chars] + "..."


    def _format_turns(turns: list[ConversationTurn]) -> str:
        lines = []
        for turn in turns:
            speaker = "AI 선생님" if turn.role == "model" else "학생"
            lines.append(f"{speaker}: {_truncate(turn.text)}")
        return "\n".join(lines) + "\n"

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
        "[★ 지금 분석할 마지막 상호작용]\n"
        "AI 선생님 발화는 학생 반응 해석을 위한 맥락입니다.\n"
        "분석 대상은 마지막 학생 발화입니다.\n"
        f"{_format_turns(last_turns)}\n"
    )

    heuristic = _build_heuristic_signals(last_turns, conversation_history)
    if heuristic:
        user_content += f"\n[휴리스틱 신호]\n{heuristic}\n"

    user_content += (
        "\n[출력 지시]\n"
        "- 위 마지막 학생 발화에 나타난 상태만 분석하세요.\n"
        "- 최근 이전 대화는 흐름 파악에만 사용하세요.\n"
        "- JSON만 출력하세요. 설명, 마크다운, 코드블록은 금지입니다.\n"
        "- 마지막 학생 발화가 짧고 모호하면 is_observable=false, struggle_delta=null로 두세요.\n"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response = await client.chat.completions.create(
        model=ANALYZE_MODEL,
        messages=messages,
        temperature=0,
        max_tokens=4096,  # 49B Nemotron은 reasoning 모델 — thinking 토큰을 내부 소모 후 JSON 출력하므로 충분한 여유 필요
        presence_penalty=0,
        frequency_penalty=0,
    )

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
        return RealtimeAnalysis(**data)
    except json.JSONDecodeError as e:
        error_msg = f"LLM 분석 응답을 JSON으로 파싱할 수 없습니다: {e}\nRaw Response: {raw_text}"
        print(f"[ERROR] {error_msg}")
        raise ValueError(error_msg)
