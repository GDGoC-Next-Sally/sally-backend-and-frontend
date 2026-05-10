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
