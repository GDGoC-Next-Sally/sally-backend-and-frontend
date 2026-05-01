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

from ai_server.models import StudentProfile, ConversationTurn, TeacherSummary
from ai_server.services.prompt_builder import build_teacher_system_prompt

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


async def call_llm(
    conversation_history: list[ConversationTurn],
    student_profile: StudentProfile | None = None
) -> dict:
    """
    JS callGeminiAPI()와 동일한 역할:
    1. 시스템 프롬프트 생성
    2. 대화 기록을 OpenRouter 포맷으로 변환
    3. LLM 호출
    4. TEACHER_SUMMARY 파싱
    5. {"reply": str, "teacher_summary": dict, "raw_text": str} 반환
    """
    client = _get_client()
    system_prompt = build_teacher_system_prompt(student_profile)

    # Gemma 모델은 system 역할을 지원하지 않으므로, 첫 번째 user 메시지에 합칩니다.
    messages = []

    for idx, turn in enumerate(conversation_history):
        role = "assistant" if turn.role == "model" else "user"
        content = turn.text
        
        if idx == 0 and turn.role == "user":
            content = f"{system_prompt}\n\n[대화 기록 시작]\n학생 첫 메시지: {turn.text}"
            
        messages.append({"role": role, "content": content})

    # LLM 호출
    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.4,
    )

    raw_text = response.choices[0].message.content

    # ── TEACHER_SUMMARY HTML 주석 파싱 (JS 로직과 동일) ──────────────────
    teacher_summary_dict = {
        "frustration_delta": 0,
        "student_understood": True,
        "is_hallucination_risk": False,
        "internal_reasoning": "(JSON 파싱 실패 - 폴백)"
    }
    reply_text = raw_text

    match = re.search(r'<!--TEACHER_SUMMARY\s*([\s\S]*?)\s*-->', raw_text, re.IGNORECASE)
    if match:
        try:
            teacher_summary_dict = json.loads(match.group(1).strip())
            # 학생에게 보여줄 텍스트에서 주석 블록 제거
            reply_text = re.sub(r'<!--TEACHER_SUMMARY\s*[\s\S]*?\s*-->', '', raw_text, flags=re.IGNORECASE).strip()
        except json.JSONDecodeError:
            pass  # 폴백 딕셔너리 사용

    return {
        "reply": reply_text,
        "teacher_summary": TeacherSummary(**teacher_summary_dict),
        "raw_text": raw_text,
    }
