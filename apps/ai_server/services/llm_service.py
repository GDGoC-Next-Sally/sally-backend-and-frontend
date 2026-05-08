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
from ai_server.models import StudentProfile, ConversationTurn, TeacherSummary
from ai_server.services.prompt_builder import build_chat_system_prompt, build_analysis_system_prompt, build_chat_few_shot_messages

# ai_server 폴더 안의 .env 파일을 명시적으로 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MODEL = "google/gemma-4-31b-it"

# ── 분석 파이프라인 상수 ─────────────────────────────────────────────────────
EMA_ALPHA = 0.4               # understanding_score EMA 가중치 (현재 턴 반영 비율)
SHORT_RESPONSE_THRESHOLD = 15  # 짧은 응답 기준 (자)

KEYWORDS_FRUSTRATION = [
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
    """마지막 학생 발화에서 자동 감지한 수치/언어 신호를 텍스트로 반환합니다.
    LLM이 frustration_delta, engagement_level 등을 더 정확히 판단하도록 힌트 제공."""
    student_turns = [t for t in last_turns if t.role == "user"]
    if not student_turns:
        return ""
    last_text = student_turns[-1].text
    signals = []

    # 신호 1: 응답 길이
    char_count = len(last_text)
    if char_count <= SHORT_RESPONSE_THRESHOLD:
        signals.append(f"- 학생 응답 길이: {char_count}자 (짧은 응답 — 무관심 또는 혼란 신호)")
    else:
        signals.append(f"- 학생 응답 길이: {char_count}자")

    # 신호 2: 키워드 감지
    found_frustration = [kw for kw in KEYWORDS_FRUSTRATION if kw in last_text]
    found_understanding = [kw for kw in KEYWORDS_UNDERSTANDING if kw in last_text]
    if found_frustration:
        signals.append(f"- 부정/포기 키워드 감지: \"{', '.join(found_frustration)}\" (혼란/좌절 신호)")
    if found_understanding:
        signals.append(f"- 이해/긍정 키워드 감지: \"{', '.join(found_understanding)}\" (이해 향상 신호)")

    # 신호 3: 연속 짧은 응답 횟수 (이탈 패턴 감지)
    all_student_turns = [t for t in conversation_history if t.role == "user"]
    consecutive_short = 0
    for t in reversed(all_student_turns):
        if len(t.text) <= SHORT_RESPONSE_THRESHOLD:
            consecutive_short += 1
        else:
            break
    if consecutive_short >= 2:
        signals.append(f"- 연속 짧은 응답 횟수: {consecutive_short}회 연속 (이탈 위험 신호)")

    return "[자동 감지된 신호 — 참고]\n" + "\n".join(signals) + "\n\n"


def _enforce_consistency(
    summary: TeacherSummary,
    previous_summary: TeacherSummary | None = None,
) -> TeacherSummary:
    """LLM 출력에 규칙 기반 후처리를 적용합니다.
    1) 값 범위 클램핑  2) EMA 스무딩(understanding_score)  3) 필드 간 모순 제거"""
    # ── 1. 범위 클램핑
    summary.frustration_delta = max(-30, min(30, summary.frustration_delta or 0))
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
    if summary.understanding_score >= 8 and (summary.frustration_delta or 0) > 10:
        summary.frustration_delta = 10

    return summary


def _get_client() -> AsyncOpenAI:
    """API Key를 런타임에 읽어서 클라이언트를 생성합니다 (lazy init)."""
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
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
        model=MODEL,
        messages=messages,
        temperature=0.4,
        stream=True,
    )

    async for chunk in response:
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
    frustration_delta 등 상대적 변화량 계산의 정확도를 높입니다.
    """
    client = _get_client()
    system_prompt = build_analysis_system_prompt(student_profile)

    # ── 대화 기록을 이전 맥락 / 마지막 턴으로 분리 ────────────────────────────
    # 마지막 턴 = 마지막 AI 발화 + 마지막 학생 발화 (최대 최근 2개)
    if len(conversation_history) >= 2:
        context_turns = conversation_history[:-2]
        last_turns = conversation_history[-2:]
    else:
        context_turns = []
        last_turns = conversation_history

    def _format_turns(turns: list) -> str:
        lines = ""
        for turn in turns:
            speaker = "AI 선생님" if turn.role == "model" else "학생"
            lines += f"{speaker}: {turn.text}\n"
        return lines

    # ── User Prompt 구성 (3구역 분리) ────────────────────────────────────────
    user_content = ""

    # [구역 1] 이전 맥락 (참고용) — 분석 대상이 아님
    if context_turns:
        user_content += f"[이전 대화 맥락 — 참고용, 분석 대상 아님]\n{_format_turns(context_turns)}\n"

    # [구역 2] 직전 분석 수치 (frustration_delta 등 상대적 변화 계산 기준점)
    if previous_summary:
        user_content += (
            "[직전 턴 분석 결과 — frustration_delta 계산의 기준점으로 활용]\n"
            f"- understanding_score: {previous_summary.understanding_score}\n"
            f"- student_emotion: {previous_summary.student_emotion}\n"
            f"- frustration_delta (직전): {previous_summary.frustration_delta}\n"
            f"- engagement_level: {previous_summary.engagement_level}\n"
            f"- confusion_type: {previous_summary.confusion_type}\n\n"
        )

    # [구역 3] 지금 분석할 마지막 턴 (핵심 분석 대상) + 휴리스틱 신호
    user_content += f"[★ 지금 분석할 마지막 턴]\n{_format_turns(last_turns)}\n"
    heuristic = _build_heuristic_signals(last_turns, conversation_history)
    if heuristic:
        user_content += heuristic
    user_content += ">> 위 [★ 지금 분석할 마지막 턴]에 나타난 학생 반응만 분석하여 JSON으로만 응답하세요."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.1,  # 분석은 더 일관되게
        # Nvidia API 등 일부 호환 API에서는 response_format 사용 시 오류가 날 수 있어,
        # 일단 system prompt에 의존하고 필요시 활성화합니다.
        # response_format={"type": "json_object"}
    )

    raw_text = response.choices[0].message.content
    
    # 순수 JSON 추출 (마크다운 포맷팅 방어)
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    raw_text = raw_text.strip()

    try:
        data = json.loads(raw_text)
        summary = TeacherSummary(**data)
        return _enforce_consistency(summary, previous_summary)
    except json.JSONDecodeError as e:
        print(f"[WARN] JSON 파싱 실패: {e}\nRaw Response: {raw_text}")
        # 실패 시 폴백 데이터 반환
        return TeacherSummary(
            frustration_delta=0,
            understanding_score=5,
            current_topic="개념학습",
            student_emotion="혼란",
            one_line_summary="분석 실패",
            question_intent="확인요청",
            confusion_type="없음",
            knowledge_gap=None,
            misconception_tag=None,
            engagement_level="보통",
        )
