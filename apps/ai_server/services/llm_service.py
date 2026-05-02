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
from ai_server.services.prompt_builder import build_chat_system_prompt, build_analysis_system_prompt

# ai_server 폴더 안의 .env 파일을 명시적으로 지정
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MODEL = "google/gemma-4-31b-it"


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

    messages = []
    for idx, turn in enumerate(conversation_history):
        role = "assistant" if turn.role == "model" else "user"
        content = turn.text
        
        # 시스템 프롬프트 병합
        if idx == 0 and turn.role == "user":
            content = f"{system_prompt}\n\n[대화 기록 시작]\n학생 첫 메시지: {turn.text}"
            
        messages.append({"role": role, "content": content})

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
    student_profile: StudentProfile | None = None
) -> TeacherSummary:
    """
    전체 대화 기록을 기반으로 학생의 현재 상태를 분석하여 TeacherSummary JSON 데이터를 반환합니다.
    """
    client = _get_client()
    system_prompt = build_analysis_system_prompt(student_profile)

    # 분석용 프롬프트는 항상 최신 대화까지 포함하여 평가합니다.
    history_text = ""
    for turn in conversation_history:
        speaker = "AI 선생님" if turn.role == "model" else "학생"
        history_text += f"{speaker}: {turn.text}\n"

    # JSON 형태를 유도하는 구조
    content = f"{system_prompt}\n\n[대화 기록 전체]\n{history_text}\n\n위 대화의 마지막 턴을 기준으로 학생 상태를 JSON으로만 응답하세요."

    messages = [{"role": "user", "content": content}]

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
        return TeacherSummary(**data)
    except json.JSONDecodeError as e:
        print(f"[WARN] JSON 파싱 실패: {e}\nRaw Response: {raw_text}")
        # 실패 시 폴백 데이터 반환
        return TeacherSummary(
            frustration_delta=0,
            student_understood=True,
            is_hallucination_risk=False,
            internal_reasoning="(분석 JSON 파싱 실패)",
            understanding_score=5,
            current_topic="개념학습",
            student_emotion="혼란",
            one_line_summary="분석 실패",
            question_intent="확인요청",
            confusion_type="없음",
            misconception_tag=None,
            learning_mode="passive"
        )
