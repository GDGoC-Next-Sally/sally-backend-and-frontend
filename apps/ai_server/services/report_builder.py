"""
services/report_builder.py — 최종 수업 리포트 생성 서비스

설계 원칙:
  - 입력: chat_messages (원시 또는 정규화된 채팅 메시지 목록)
  - 처리:
      1. 메시지 정규화
      2. LLM용 대화 텍스트 포맷팅
      3. 토큰 수 추정
      4. 짧으면 전체 원문 기반 1회 LLM 호출
      5. 길면 chunk summary 생성 후 최종 synthesis
      6. JSON 파싱 및 FinalReport 검증
      7. 파싱 실패 시 JSON repair 1회 재시도
      8. 한자 포함 시 한글 변환 repair 1회 재시도
      9. 불필요한 영어 포함 시 한글 변환 repair 1회 재시도
  - 출력: FinalReport
      - key_concepts
      - misconception_summary
      - session_summary
      - detailed_report
"""

import json
import os
import re
from pathlib import Path
from typing import Optional, Any

from dotenv import load_dotenv
from openai import AsyncOpenAI

from ai_server.models import FinalReport
from ai_server.services.message_formatting import format_labeled_message


# ─────────────────────────────────────────────────────────────
# 환경 설정
# ─────────────────────────────────────────────────────────────

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    if not value or not value.strip():
        return default
    return value.strip().strip('"').strip("'")


def _normalize_nvidia_model_id(model: str) -> str:
    if model == "nemotron-3-super-120b-a12b":
        return "nvidia/nemotron-3-super-120b-a12b"
    return model


# ── 모델 설정 (NVIDIA NIM OpenAI-compatible API) ────────────────────────────
NVIDIA_BASE_URL = _env_str(
    "NVIDIA_BASE_URL",
    "https://integrate.api.nvidia.com/v1",
)
NVIDIA_CHAT_MODEL = _env_str("NVIDIA_CHAT_MODEL", "google/gemma-4-31b-it")
NVIDIA_REPORT_SUMMARY_MODEL = _normalize_nvidia_model_id(
    _env_str("NVIDIA_REPORT_SUMMARY_MODEL", NVIDIA_CHAT_MODEL)
)
NVIDIA_REPORT_FINAL_MODEL = _normalize_nvidia_model_id(
    _env_str(
        "NVIDIA_REPORT_FINAL_MODEL",
        _env_str("NVIDIA_REPORT_MODEL", "nvidia/nemotron-3-super-120b-a12b"),
    )
)

# Backward-compatible alias for modules that only need the final report model.
REPORT_MODEL = NVIDIA_REPORT_FINAL_MODEL

# 짧은 세션 기준 추정 토큰 수
# rough estimate: 약 4글자 = 1토큰
SHORT_SESSION_TOKEN_THRESHOLD = 6000
CHARS_PER_TOKEN = 4

# 긴 세션 chunk 분할 기준
CHUNK_MAX_CHARS = 8000

MISSING_CONCEPT_VALUES = {
    "",
    "없음",
    "해당없음",
    "해당 없음",
    "판단 불가",
    "학생 발화 없음",
    "분석 불가",
    "응답 없음",
    "수업 외 대화",
    "학습 참여 거부",
    "학습 무력감",
    "개념학습",
}


# ─────────────────────────────────────────────────────────────
# 공통 언어 규칙
# ─────────────────────────────────────────────────────────────

LANGUAGE_RULE = """언어 및 표기 규칙:
- 모든 설명은 현대 한국어의 한글 문장으로 작성하세요.
- 한자, 일본어, 중국어 표기를 절대 사용하지 마세요.
- 중국어식 표현, 일본식 한자어 표기, 한자 혼용 문장을 사용하지 마세요.
- 예: "學生", "關係代名詞", "目的格", "主格", "理解", "文法", "説明", "質問"처럼 쓰지 마세요.
- 위 표현은 반드시 "학생", "관계대명사", "목적격", "주격", "이해", "문법", "설명", "질문"처럼 한글로 작성하세요.
- 영어는 학생 발화나 수업 내용에 직접 나온 예문, who/which/that 같은 필수 문법 표기, AI/Sally 같은 고유명사에만 사용하세요.
- relative pronoun, subject, object, weakness, summary, feedback처럼 한글로 자연스럽게 쓸 수 있는 영어 설명어는 각각 관계대명사, 주어, 목적어, 취약점, 요약, 피드백처럼 번역하세요.
- JSON key는 지정된 영어 필드명을 그대로 사용하세요.
- JSON value의 설명 문장은 한글 중심의 한국어로 작성하세요."""


LATIN_WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9'_-]*")
ENGLISH_EXAMPLE_SPAN_PATTERN = re.compile(
    r"\b(?:[A-Za-z][A-Za-z0-9'_-]*[\s,.!?;:'\"()]+){2,}[A-Za-z][A-Za-z0-9'_-]*\b"
)
ENGLISH_EXAMPLE_MARKERS = {"who", "which", "that", "whom", "whose", "where", "when"}
UNWANTED_REPORT_ENGLISH_WORDS = {
    "abilities",
    "ability",
    "action",
    "actions",
    "activities",
    "activity",
    "analyses",
    "analysis",
    "application",
    "applications",
    "assessment",
    "assessments",
    "answer",
    "answers",
    "antecedent",
    "behavior",
    "behaviors",
    "class",
    "clause",
    "concept",
    "concepts",
    "conclusion",
    "conclusions",
    "content",
    "contents",
    "context",
    "contexts",
    "confused",
    "confusion",
    "course",
    "criteria",
    "criterion",
    "current",
    "detail",
    "detailed",
    "discussion",
    "discussions",
    "engagement",
    "error",
    "errors",
    "evaluation",
    "evaluations",
    "example",
    "examples",
    "evidence",
    "explanation",
    "explanations",
    "expression",
    "expressions",
    "feedback",
    "final",
    "flow",
    "goal",
    "goals",
    "grammar",
    "guidance",
    "guide",
    "hint",
    "hints",
    "improved",
    "improvement",
    "issue",
    "issues",
    "item",
    "items",
    "key",
    "learn",
    "learning",
    "lesson",
    "lessons",
    "logic",
    "main",
    "misconception",
    "misconceptions",
    "need",
    "needs",
    "object",
    "objective",
    "objectives",
    "observation",
    "observations",
    "pattern",
    "patterns",
    "point",
    "points",
    "practice",
    "progress",
    "pronoun",
    "question",
    "questions",
    "relative",
    "report",
    "response",
    "responses",
    "result",
    "results",
    "review",
    "reviews",
    "role",
    "roles",
    "sentence",
    "session",
    "skill",
    "skills",
    "solution",
    "solutions",
    "status",
    "step",
    "steps",
    "strategy",
    "strategies",
    "strength",
    "strengths",
    "student",
    "students",
    "subject",
    "summary",
    "support",
    "task",
    "tasks",
    "teacher",
    "teachers",
    "test",
    "tests",
    "topic",
    "topics",
    "type",
    "types",
    "understand",
    "understanding",
    "understood",
    "unit",
    "units",
    "weakness",
    "weaknesses",
}


# ─────────────────────────────────────────────────────────────
# OpenAI-compatible NVIDIA NIM client
# ─────────────────────────────────────────────────────────────

def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")

    return AsyncOpenAI(
        base_url=NVIDIA_BASE_URL,
        api_key=api_key,
    )


# ─────────────────────────────────────────────────────────────
# Message normalization / formatting
# ─────────────────────────────────────────────────────────────

def normalize_chat_messages(raw_messages: list[dict]) -> list[dict]:
    """
    DB 또는 백엔드에서 가져온 다양한 형태의 메시지를
    FinalReport 생성용 표준 포맷으로 정규화합니다.

    표준 포맷:
    {
        "role": "student" | "assistant" | "teacher" | "system",
        "content": str,
        "created_at": str | None
    }

    지원하는 입력 예:
    - {"role": "student", "content": "..."}
    - {"sender": "USER", "message": "..."}
    - {"sender_type": "STUDENT", "content": "..."}
    - {"message_role": "AI", "text": "..."}
    """
    normalized: list[dict] = []

    for msg in raw_messages:
        if not isinstance(msg, dict):
            continue

        raw_role = (
            msg.get("role")
            or msg.get("sender_type")
            or msg.get("sender")
            or msg.get("message_role")
            or msg.get("author")
        )

        content = (
            msg.get("content")
            or msg.get("message")
            or msg.get("text")
            or msg.get("body")
            or ""
        )

        created_at = (
            msg.get("created_at")
            or msg.get("createdAt")
            or msg.get("timestamp")
            or msg.get("time")
        )

        content = str(content).strip()
        if not content:
            continue

        role_str = str(raw_role).strip().upper() if raw_role is not None else ""

        if role_str == "STUDENT":
            normalized_role = "student"
        elif role_str == "AI":
            normalized_role = "assistant"
        elif role_str == "TEACHER":
            normalized_role = "teacher"
        elif role_str == "SYSTEM":
            normalized_role = "system"
        else:
            # 알 수 없는 발화자는 통과
            continue

        normalized.append(
            {
                "role": normalized_role,
                "content": content,
                "created_at": str(created_at) if created_at else None,
            }
        )

    return normalized


def _format_conversation(chat_messages: list[dict]) -> tuple[str, bool]:
    """
    정규화된 채팅 메시지 목록을 LLM용 대화 텍스트로 포맷팅합니다.

    user 메시지 주체가 드러나도록 "선생님 지시: {}", "학생이름: {}",
    "시스템: {}" 형태로 포맷팅합니다.

    Returns:
        (formatted_text, has_student_message)
    """
    lines: list[str] = []
    has_student = False

    for msg in chat_messages:
        role = msg.get("role", "")
        content = str(msg.get("content", "")).strip()

        if not content:
            continue

        if role == "student":
            lines.append(
                format_labeled_message(
                    content,
                    "STUDENT",
                )
            )
            has_student = True
        elif role == "assistant":
            lines.append(format_labeled_message(content, "AI"))
        elif role == "teacher":
            lines.append(format_labeled_message(content, "TEACHER"))
        elif role == "system":
            lines.append(format_labeled_message(content, "SYSTEM"))
        else:
            continue

    return "\n".join(lines), has_student


def _estimate_tokens(text: str) -> int:
    """문자열의 토큰 수를 rough하게 추정합니다."""
    return max(1, len(text) // CHARS_PER_TOKEN)


def _split_into_chunks(text: str, chunk_max_chars: int = CHUNK_MAX_CHARS) -> list[str]:
    """
    긴 대화를 chunk 단위로 분할합니다.
    가능한 한 메시지 줄 단위로 끊습니다.
    """
    lines = text.split("\n")
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line) + 1

        if current_len + line_len > chunk_max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_len = line_len
        else:
            current_chunk.append(line)
            current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


# ─────────────────────────────────────────────────────────────
# Prompt builders
# ─────────────────────────────────────────────────────────────

def _build_report_prompt(conversation_text: str, realtime_context: str = "") -> str:
    """전체 대화 기반 최종 리포트 생성 프롬프트를 생성합니다."""
    realtime_section = f"\n\n보조 컨텍스트:{realtime_context}" if realtime_context else ""
    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 학생과 AI 튜터 Sally가 진행한 한 세션의 채팅 기록입니다.
이 대화를 바탕으로 교사용 학생별 최종 리포트를 생성하세요.
선생님 관점에서 비판적으로 평가하세요.{realtime_section}

리포트 목적:
- 세션 주요 학습 주제와 학생의 최종 취약 개념을 정리합니다.
- 세션 종료 시점에도 남아 있는 오개념과 구체적 약점을 요약합니다.
- 교사가 빠르게 볼 수 있는 세션 상태 요약과 마크다운 형식의 상세 리포트를 생성합니다.

핵심 판단 원칙:
- 최종 리포트는 세션 중간의 일시적 오류가 아니라, 세션 종료 시점의 이해 상태를 기준으로 작성하세요.
- 학생의 이해 상태와 오개념은 반드시 학생 이름 또는 학생 라벨로 표시된 발화를 중심으로 판단하세요.
- AI 선생님의 설명을 학생이 이해한 것으로 간주하지 마세요.
- "선생님 지시:"는 교사가 AI에게 백그라운드로 전달한 비공개 지도 방향입니다. 학생에게 보인 발화가 아니므로 학생 이해도·오개념·감정의 근거로 사용하지 마세요.
- 선생님 지시는 해당 시점에 어떤 지도 전략이 요청되었는지 파악하는 보조 맥락으로만 사용하세요.
- 초반에 오개념이 있었더라도 이후 학생이 스스로 정정했거나 올바르게 이해한 근거가 있으면 최종 오개념·약점으로 분류하지 마세요.
- 해결된 오개념은 misconception_summary에 넣지 말고, detailed_report에서 이해 변화로 설명하세요.
- 마지막까지 이해했는지 근거가 부족하면 해결됐다고 단정하지 말고 추가 확인이 필요하다고 표현하세요.
- 취약 개념, 오개념, 약점이 실제 대화에서 확인되지 않으면 지어내지 말고 ["없음"]으로 작성하세요.
- 긍정 평가와 부정 평가는 실제 대화에서 확인된 근거 비율을 반영하세요.
- 학생을 비난하거나 낙인찍지 말고, 교사가 지도에 참고할 수 있는 표현으로 작성하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 수치형 지표는 포함하지 마세요.
- 출력 전체는 반드시 JSON 형식으로만 작성하고, 코드블록이나 JSON 바깥 설명문은 출력하지 마세요.
- 단, detailed_report 값은 마크다운 문자열로 작성하세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "key_concepts": {{
    "main_concepts": ["string"],
    "weak_concepts": ["string"]
  }},
  "misconception_summary": ["string"],
  "session_summary": "string",
  "detailed_report": "string"
}}

필드 작성 기준:
1. key_concepts = 주요/취약 개념
- 반드시 객체로 작성하세요. 배열이나 문자열로 작성하지 마세요.
- main_concepts에는 세션에서 다룬 주요 학습 주제를 짧은 명사구 배열로 작성하세요.
- main_concepts는 학생이 최종적으로 완전히 이해했는지와 별개로, 세션에서 실제로 다룬 학습 주제를 나타냅니다.
- 보조 컨텍스트에 "주요 학습 주제 후보"가 있으면 main_concepts의 우선 후보로 사용하세요.
- 대화 또는 보조 컨텍스트에서 주제가 확인되면 main_concepts를 ["없음"]으로 작성하지 마세요.
- 학생 이름, 계정명, 감정, 태도, "응답 없음", "수업 외 대화"는 main_concepts에 넣지 마세요.
- weak_concepts에는 세션 종료 시점에도 추가 지도가 필요한 취약 개념을 짧은 명사구 배열로 작성하세요.
- 초반에 어려워했더라도 이후 이해한 근거가 있으면 취약 개념으로 분류하지 마세요.
- 주요 학습 주제나 취약 개념이 명확하지 않은 하위 필드는 ["없음"]으로 작성하세요.

2. misconception_summary = 오개념·약점 요약
- 세션 종료 시점까지 남아 있는 오개념, 해결되지 않은 혼란, 여전히 남은 풀이 약점을 구체적인 문장 배열로 작성하세요.
- 단순히 "개념 이해 부족"처럼 추상적으로 쓰지 말고, 무엇을 어떻게 잘못 이해했는지 작성하세요.
- 초반 오개념이 이후 해결되었다면 이 필드에 포함하지 마세요.
- 최종적으로 남은 오개념이나 약점이 명확하지 않으면 ["없음"]으로 작성하세요.

3. session_summary = 세션 상태 요약
- 교사용 한 줄 요약입니다.
- 세션 종료 시점 기준의 학습 상태, 확인된 강점, 남은 취약점, 다음 지도 필요성을 80자 이내 1문장으로 작성하세요.

4. detailed_report = 교사용 마크다운 상세 리포트
- 반드시 마크다운 문자열로 작성하세요. JSON 문자열 안에서 줄바꿈은 \n으로 표현될 수 있습니다.
- 가능한 한 자세히 작성하되, 실제 대화에서 확인된 근거를 중심으로 작성하세요.
- 다음 섹션을 포함하세요: "## 수업 흐름 요약", "## 학생 강점", "## 학생 취약점", "## 이해 변화와 남은 오개념", "## 보완 지도 제안", "## 다음 수업 확인 질문".
- 학생 강점에는 학생이 스스로 정정한 부분, 질문을 통해 확인한 이해, 풀이 전략을 받아들인 흔적을 작성하세요.
- 학생 취약점에는 세션 종료 시점에도 남은 혼란, 반복 실수, 추가 확인이 필요한 개념을 구체적으로 작성하세요.
- 보완 지도 제안에는 다음 수업에서 교사가 바로 사용할 수 있는 지도 순서, 예문 유형, 확인 질문을 작성하세요.
- 오개념이나 약점이 확인되지 않았다면 해당 섹션에 "뚜렷한 오개념은 확인되지 않았습니다"라고 작성하세요.
- 한자 표기를 사용하지 말고, 설명문은 한글 한국어로만 작성하세요.

채팅 기록:
{conversation_text}
"""


def _build_chunk_summary_prompt(
    chunk_text: str,
    chunk_index: int,
    total_chunks: int,
) -> str:
    """chunk 단위 중간 요약 프롬프트를 생성합니다."""
    return f"""당신은 긴 학생-튜터 대화를 최종 학생별 리포트 생성에 사용할 수 있도록 요약하는 학습 분석 AI입니다.

아래는 학생과 AI 튜터 Sally의 학습 대화 중 {chunk_index + 1}/{total_chunks}번째 부분입니다.
이 대화 chunk를 읽고, 최종 리포트 생성에 필요한 정보만 한국어로 요약하세요.

최종 리포트에서 필요한 정보:
- 주요/취약 개념
- 세션 종료 시점에도 남을 수 있는 오개념·약점 후보
- 이 chunk 안에서 해결된 혼란 또는 정정된 오개념
- 세션 상태 요약에 반영할 학습 상태
- 마크다운 상세 리포트에 반영할 이해 변화, 장점, 약점, 다음 지도 방향

중요:
- 학생의 이해 상태와 오개념은 반드시 학생 이름 또는 학생 라벨로 표시된 발화를 중심으로 판단하세요.
- AI 선생님의 설명을 학생이 이해한 것으로 간주하지 마세요.
- AI 선생님이 설명한 내용은 다룬 개념으로 볼 수는 있지만, 학생이 이해한 내용으로 단정하지 마세요.
- "선생님 지시:"는 AI에게 전달된 비공개 지도 방향이며 학생 발화가 아닙니다. 학생 상태 판단 근거와 evidence_student_utterances에 포함하지 마세요.
- 반복되는 혼란, 오개념, 풀이 막힘을 중심으로 요약하되, 이 chunk 안에서 해결되었는지도 함께 확인하세요.
- 세션 초반이나 chunk 초반에 나타난 오개념이라도, 이후 학생 발화에서 정정되거나 이해가 개선된 근거가 있으면 resolved_confusions에 기록하세요.
- 근거가 부족한 내용은 추측하지 말고 빈 배열 또는 "판단하기 어려움"으로 표시하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 한 번만 나온 단순 실수는 반복 오개념처럼 과장하지 마세요.
- 취약 개념, 오개념, 약점이 실제 대화에서 확인되지 않으면 절대 지어내지 마세요.
- 긍정적 요소와 부정적 요소를 모두 확인하고, 실제 대화의 근거 비율에 맞게 요약하세요.
- 출력은 반드시 JSON 형식으로만 작성하세요.
- 마크다운, 코드블록, 설명문, 주석은 출력하지 마세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "chunk_index": {chunk_index + 1},
  "total_chunks": {total_chunks},
  "main_topics": ["string"],
  "student_confusions": ["string"],
  "misconceptions": ["string"],
  "weak_steps": ["string"],
  "resolved_confusions": ["string"],
  "evidence_student_utterances": ["string"],
  "positive_observations": ["string"],
  "progress": "string"
}}

필드 작성 기준:
- chunk_index: 현재 chunk 번호입니다.
- total_chunks: 전체 chunk 개수입니다.
- main_topics: 이 chunk에서 실제로 다룬 주요 학습 개념과 취약 개념 후보를 짧은 명사구 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- main_topics에는 학생이 정답을 말한 개념뿐 아니라 AI 질문, 문제, 설명에서 반복적으로 다룬 학습 주제도 포함하세요.
- 학생 이름, 계정명, 감정, 태도, "응답 없음", "수업 외 대화"는 main_topics에 넣지 마세요.
- student_confusions: 이 chunk에서 학생이 헷갈려 한 부분을 구체적인 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- misconceptions: 이 chunk에서 학생 발화에 드러난 잘못된 이해나 오개념 후보를 문장 배열로 작성하세요. 같은 chunk 안에서 이후 해결된 경우에는 resolved_confusions에도 반드시 기록하세요. 확인되지 않으면 []로 작성하세요.
- weak_steps: 문제 풀이, 개념 적용, 설명 이해 과정에서 학생이 막힌 단계를 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- resolved_confusions: 이 chunk 안에서 초반에는 헷갈렸지만 이후 학생 발화에서 정정되었거나 이해가 개선된 것으로 확인되는 내용을 작성하세요. 확인되지 않으면 []로 작성하세요.
- evidence_student_utterances: 위 판단의 근거가 되는 핵심 학생 이름 또는 학생 라벨로 표시된 발화 원문을 그대로 배열로 남기세요. 확인되지 않으면 []로 작성하세요.
- positive_observations: 학생이 잘 이해한 부분, 스스로 정정한 부분, 개선된 부분, 적절히 답한 부분을 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- progress: 이 chunk 안에서 보인 이해 변화, 장점, 개선 흐름, 또는 여전히 남은 어려움을 1문장으로 작성하세요. 판단하기 어렵다면 "판단하기 어려움"이라고 작성하세요.

작성 규칙:
- 해당 항목이 대화에서 확인되지 않으면 빈 배열 []로 출력하세요.
- 학생 발화에서 직접 확인되지 않는 오개념은 만들지 마세요.
- AI 선생님이 설명한 개념을 main_topics에는 포함할 수 있지만, 학생이 이해했다고 단정하지 마세요.
- evidence_student_utterances에는 AI 선생님 발화를 넣지 마세요.
- 동일한 의미의 항목은 중복해서 작성하지 마세요.
- 해결된 오개념이나 정정된 혼란은 misconceptions에만 남기지 말고 resolved_confusions에도 기록하세요.
- 모든 설명은 한글 한국어로 작성하고, 한자 표기를 사용하지 마세요.

대화 chunk:
{chunk_text}
"""


def _build_synthesis_prompt(chunk_summaries: list[str], realtime_context: str = "") -> str:
    """chunk 요약들을 합쳐 최종 리포트를 만드는 프롬프트를 생성합니다."""
    summaries_text = "\n\n".join(
        f"[{i + 1}번째 파트 요약]\n{s}" for i, s in enumerate(chunk_summaries)
    )
    realtime_section = f"\n\n보조 컨텍스트:{realtime_context}" if realtime_context else ""

    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 학생과 AI 튜터 Sally가 진행한 긴 학습 세션을 파트별로 요약한 내용입니다.
파트별 요약을 시간 순서대로 종합하여 교사용 학생별 최종 리포트를 생성하세요.{realtime_section}

리포트 목적:
- 세션 주요 학습 주제와 학생의 최종 취약 개념을 정리합니다.
- 세션 종료 시점에도 남아 있는 오개념과 구체적 약점을 요약합니다.
- 교사가 빠르게 볼 수 있는 세션 상태 요약과 마크다운 형식의 상세 리포트를 생성합니다.

핵심 판단 원칙:
- 최종 리포트는 중간의 일시적 오류가 아니라, 세션 종료 시점의 이해 상태를 기준으로 작성하세요.
- 파트별 요약을 시간 순서로 해석하고, 앞 파트의 오개념이 뒤 파트에서 해결되었는지 반드시 확인하세요.
- 앞 파트의 misconceptions에 등장한 내용이라도 뒤 파트의 resolved_confusions, positive_observations, progress에서 정정 또는 개선 근거가 있으면 최종 오개념·약점으로 분류하지 마세요.
- 해결된 오개념은 misconception_summary에 넣지 말고, detailed_report에서 이해 변화로 설명하세요.
- 마지막까지 이해했는지 근거가 부족하면 해결됐다고 단정하지 말고 추가 확인이 필요하다고 표현하세요.
- 취약 개념, 오개념, 약점이 실제 요약에서 확인되지 않으면 지어내지 말고 ["없음"]으로 작성하세요.
- 긍정 평가와 부정 평가는 파트별 요약에서 확인된 근거 비율을 반영하세요.
- 학생을 비난하거나 낙인찍지 말고, 교사가 지도에 참고할 수 있는 표현으로 작성하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 수치형 지표는 포함하지 마세요.
- 출력 전체는 반드시 JSON 형식으로만 작성하고, 코드블록이나 JSON 바깥 설명문은 출력하지 마세요.
- 단, detailed_report 값은 마크다운 문자열로 작성하세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

{LANGUAGE_RULE}

파트별 요약 활용 기준:
- main_topics는 key_concepts 후보로 활용하세요.
- student_confusions, misconceptions, weak_steps는 최종 약점 후보로 보되, 후반부에서 해결되었는지 확인하세요.
- resolved_confusions는 최종 misconception_summary에서 제외해야 할 해결된 혼란 후보로 활용하세요.
- positive_observations와 progress는 detailed_report에서 장점과 이해 변화 설명에 활용하세요.
- evidence_student_utterances는 판단 근거로만 참고하고, 최종 리포트에 과도하게 나열하지 마세요.

출력 형식:
{{
  "key_concepts": {{
    "main_concepts": ["string"],
    "weak_concepts": ["string"]
  }},
  "misconception_summary": ["string"],
  "session_summary": "string",
  "detailed_report": "string"
}}

필드 작성 기준:
1. key_concepts = 주요/취약 개념
- 반드시 객체로 작성하세요. 배열이나 문자열로 작성하지 마세요.
- main_concepts에는 세션에서 다룬 주요 학습 주제를 짧은 명사구 배열로 작성하세요.
- main_concepts는 학생이 최종적으로 완전히 이해했는지와 별개로, 세션에서 실제로 다룬 학습 주제를 나타냅니다.
- 보조 컨텍스트에 "주요 학습 주제 후보"가 있으면 main_concepts의 우선 후보로 사용하세요.
- 파트별 요약 또는 보조 컨텍스트에서 주제가 확인되면 main_concepts를 ["없음"]으로 작성하지 마세요.
- 학생 이름, 계정명, 감정, 태도, "응답 없음", "수업 외 대화"는 main_concepts에 넣지 마세요.
- weak_concepts에는 세션 종료 시점에도 추가 지도가 필요한 취약 개념을 짧은 명사구 배열로 작성하세요.
- 초반 또는 중간에 어려워했더라도 후반부에서 이해한 근거가 있으면 취약 개념으로 분류하지 마세요.
- 주요 학습 주제나 취약 개념이 명확하지 않은 하위 필드는 ["없음"]으로 작성하세요.

2. misconception_summary = 오개념·약점 요약
- 세션 종료 시점까지 남아 있는 오개념, 해결되지 않은 혼란, 여전히 남은 풀이 약점을 구체적인 문장 배열로 작성하세요.
- 단순히 "개념 이해 부족"처럼 추상적으로 쓰지 말고, 무엇을 어떻게 잘못 이해했는지 작성하세요.
- 앞 파트의 오개념이 뒤 파트에서 해결되었다면 이 필드에 포함하지 마세요.
- 최종적으로 남은 오개념이나 약점이 명확하지 않으면 ["없음"]으로 작성하세요.

3. session_summary = 세션 상태 요약
- 교사용 한 줄 요약입니다.
- 세션 종료 시점 기준의 학습 상태, 확인된 강점, 남은 취약점, 다음 지도 필요성을 80자 이내 1문장으로 작성하세요.

4. detailed_report = 교사용 마크다운 상세 리포트
- 반드시 마크다운 문자열로 작성하세요. JSON 문자열 안에서 줄바꿈은 \n으로 표현될 수 있습니다.
- 가능한 한 자세히 작성하되, 파트별 요약에서 확인된 근거를 중심으로 작성하세요.
- 다음 섹션을 포함하세요: "## 수업 흐름 요약", "## 학생 강점", "## 학생 취약점", "## 이해 변화와 남은 오개념", "## 보완 지도 제안", "## 다음 수업 확인 질문".
- 학생 강점에는 스스로 정정한 부분, 질문을 통해 드러난 이해, 풀이 전략을 받아들인 흔적을 작성하세요.
- 학생 취약점에는 세션 종료 시점에도 남은 혼란, 반복 실수, 추가 확인이 필요한 개념을 구체적으로 작성하세요.
- 보완 지도 제안에는 다음 수업에서 교사가 바로 사용할 수 있는 지도 순서, 예문 유형, 확인 질문을 작성하세요.
- 오개념이나 약점이 확인되지 않았다면 해당 섹션에 "뚜렷한 오개념은 확인되지 않았습니다"라고 작성하세요.
- 한자 표기를 사용하지 마세요.

파트별 요약:
{summaries_text}
"""


def _build_repair_json_prompt(raw_text: str) -> str:
    """깨진 JSON 응답을 FinalReport 스키마 JSON으로 복구하는 프롬프트를 생성합니다."""
    return f"""아래 텍스트를 유효한 JSON으로만 변환하세요.

반드시 다음 4개 필드만 포함하세요.
- key_concepts: object
  - main_concepts: string[]
  - weak_concepts: string[]
- misconception_summary: string[]
- session_summary: string
- detailed_report: string

규칙:
- 코드블록, JSON 바깥 설명문, 주석은 출력하지 마세요.
- detailed_report 값 안의 마크다운은 유지하거나 생성할 수 있습니다.
- JSON 객체 하나만 출력하세요.
- key_concepts는 반드시 객체로 출력하고, 판단하기 어려운 하위 필드는 ["없음"]으로 두세요.
- misconception_summary가 없거나 판단하기 어려운 경우 ["없음"]으로 두세요.
- session_summary가 없으면 주어진 텍스트를 바탕으로 짧게 생성하세요.
- detailed_report가 없으면 학생별 수업 흐름, 강점, 취약점, 이해 변화, 보완 지도 제안, 다음 확인 질문을 포함한 마크다운 문자열로 생성하세요.
- 모든 설명은 현대 한국어의 한글 문장으로 작성하세요.
- 한자, 일본어, 중국어 표기를 절대 사용하지 마세요.
- 예: "學生", "關係代名詞", "目的格", "主格", "理解", "文法"처럼 쓰지 말고 "학생", "관계대명사", "목적격", "주격", "이해", "문법"처럼 작성하세요.
- 학생 발화나 수업 내용에 직접 나온 영어 예문과 who/which/that 같은 필수 문법 표기만 유지하고, 설명문에 섞인 영어 단어는 한글로 번역하세요.

변환할 텍스트:
{raw_text}
"""


def _build_remove_foreign_chars_prompt(report_json: str) -> str:
    """FinalReport JSON의 한자, 일본어, 중국어 표기를 한글로 바꾸는 프롬프트를 생성합니다."""
    return f"""아래 JSON의 구조와 의미는 유지하되, 값에 포함된 한자, 일본어, 중국어 표기를 모두 자연스러운 한국어 표현으로 바꾸세요.

규칙:
- JSON key는 그대로 유지하세요.
- JSON value의 의미를 바꾸지 마세요.
- 한자, 일본어, 중국어 표기를 절대 사용하지 마세요.
- 예: "學生", "關係代名詞", "目的格", "主格", "理解", "文法" 등은 각각 "학생", "관계대명사", "목적격", "주격", "이해", "문법"으로 바꾸세요.
- 학생 발화나 수업 내용에 직접 나온 영어 예문과 who/which/that 같은 필수 문법 표기만 유지하고, 설명문에 섞인 영어 단어는 한글로 번역하세요.
- 코드블록, JSON 바깥 설명문 없이 JSON 객체만 출력하세요.
- detailed_report 값 안의 마크다운은 유지하세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

입력 JSON:
{report_json}
"""


def _build_remove_unwanted_english_prompt(report_json: str) -> str:
    """FinalReport JSON 값에 섞인 불필요한 영어를 한글 표현으로 바꾸는 프롬프트를 생성합니다."""
    return f"""아래 JSON의 구조와 의미는 유지하되, JSON 값에 포함된 불필요한 영어 단어와 영어 문구를 자연스러운 한국어 표현으로 바꾸세요.

규칙:
- JSON key는 그대로 유지하세요.
- JSON value의 의미를 바꾸지 마세요.
- 학생 발화나 수업 내용에 직접 나온 영어 예문은 그대로 유지할 수 있습니다.
- who, which, that, whom, whose 같은 영어 문법 표기는 필요할 때만 그대로 유지할 수 있습니다.
- AI, Sally 같은 고유명사는 그대로 유지할 수 있습니다.
- relative pronoun, subject, object, weakness, summary, feedback, flow, strength, support처럼 설명문에 섞인 영어는 한글로 번역하세요.
- 한국어 문장 안에 불필요한 영어 설명어가 남지 않게 하세요.
- 한자, 일본어, 중국어 표기를 절대 사용하지 마세요.
- 코드블록, JSON 바깥 설명문 없이 JSON 객체만 출력하세요.
- detailed_report 값 안의 마크다운은 유지하세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

입력 JSON:
{report_json}
"""


# ─────────────────────────────────────────────────────────────
# JSON parsing / validation
# ─────────────────────────────────────────────────────────────

def _strip_code_fence(raw_text: str) -> str:
    """LLM 응답에서 markdown code fence를 제거합니다."""
    text = raw_text.strip()

    if text.startswith("```json"):
        text = text[len("```json"):].strip()
    elif text.startswith("```"):
        text = text[len("```"):].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    return text


def _extract_json_object(raw_text: str) -> str:
    """
    응답 텍스트에서 JSON 객체 부분만 추출합니다.
    중첩 괄호 카운팅 방식으로 올바른 JSON 범위를 찾습니다.
    """
    text = _strip_code_fence(raw_text)

    # 제어 문자 제거
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text).strip()

    start = text.find("{")
    if start == -1:
        return text

    depth = 0
    in_string = False
    escape_next = False
    end = start

    for i, ch in enumerate(text[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    return text[start:end + 1]


def _parse_report_json(raw_text: str) -> dict[str, Any]:
    """LLM 응답에서 FinalReport JSON을 추출하고 파싱합니다."""
    json_text = _extract_json_object(raw_text)
    return json.loads(json_text)


def _default_key_concepts() -> dict[str, list[str]]:
    return {
        "main_concepts": ["없음"],
        "weak_concepts": ["없음"],
    }


def _clean_concept_value(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _is_missing_concept_value(value: Any) -> bool:
    cleaned = _clean_concept_value(value)
    return not cleaned or cleaned in MISSING_CONCEPT_VALUES


def _dedupe_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for item in items:
        cleaned = _clean_concept_value(item)
        key = cleaned.lower()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        deduped.append(cleaned)
    return deduped


def _extract_realtime_topic_candidates(
    realtime_summaries: Optional[list[dict]],
    max_items: int = 5,
) -> list[str]:
    if not realtime_summaries:
        return []

    topic_stats: dict[str, dict[str, Any]] = {}
    for index, summary in enumerate(realtime_summaries):
        if not isinstance(summary, dict):
            continue

        topic = _clean_concept_value(summary.get("current_topic"))
        if _is_missing_concept_value(topic):
            continue
        if len(topic) > 30:
            continue

        key = topic.lower()
        if key not in topic_stats:
            topic_stats[key] = {
                "topic": topic,
                "count": 0,
                "first_index": index,
                "last_index": index,
            }
        topic_stats[key]["count"] += 1
        topic_stats[key]["last_index"] = index

    ranked = sorted(
        topic_stats.values(),
        key=lambda item: (-item["count"], -item["last_index"], item["first_index"]),
    )
    return _dedupe_preserve_order([str(item["topic"]) for item in ranked])[:max_items]


def _main_concepts_missing(main_concepts: Any) -> bool:
    if not isinstance(main_concepts, list) or not main_concepts:
        return True
    return all(_is_missing_concept_value(item) for item in main_concepts)


def _apply_realtime_topic_fallback(
    data: dict[str, Any],
    realtime_topic_candidates: list[str],
) -> dict[str, Any]:
    if not realtime_topic_candidates:
        return data

    normalized = dict(data)
    key_concepts = _normalize_key_concepts(normalized.get("key_concepts"))
    if _main_concepts_missing(key_concepts.get("main_concepts")):
        key_concepts["main_concepts"] = realtime_topic_candidates[:3]

    normalized["key_concepts"] = key_concepts
    return normalized


def _normalize_key_concepts(value: Any) -> dict[str, list[str]]:
    """
    FinalReport.key_concepts는 dict 스키마입니다.
    구버전 프롬프트/LLM 응답이 string[] 또는 string으로 반환한 경우에도
    저장 가능한 구조로 정규화합니다.
    """
    if isinstance(value, dict):
        main_concepts = value.get("main_concepts") or value.get("main") or value.get("topics")
        weak_concepts = value.get("weak_concepts") or value.get("weak") or value.get("gaps")

        def _list_or_default(items: Any) -> list[str]:
            if isinstance(items, list):
                cleaned = [str(item).strip() for item in items if str(item).strip()]
                return cleaned or ["없음"]
            if isinstance(items, str) and items.strip():
                return [items.strip()]
            return ["없음"]

        return {
            "main_concepts": _list_or_default(main_concepts),
            "weak_concepts": _list_or_default(weak_concepts),
        }

    if isinstance(value, list):
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return {
            "main_concepts": cleaned or ["없음"],
            "weak_concepts": ["없음"],
        }

    if isinstance(value, str) and value.strip():
        return {
            "main_concepts": [value.strip()],
            "weak_concepts": ["없음"],
        }

    return _default_key_concepts()


def _normalize_final_report_data(data: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(data)
    normalized["key_concepts"] = _normalize_key_concepts(normalized.get("key_concepts"))
    return normalized


# ─────────────────────────────────────────────────────────────
# Foreign Character detection / repair
# ─────────────────────────────────────────────────────────────

# 한자(중국어 포함) 및 일본어(히라가나, 가타카나) 감지 정규식
FOREIGN_CHAR_PATTERN = re.compile(r"[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]")


def _contains_foreign_chars(text: str) -> bool:
    """문자열에 한자/일본어/중국어 표기가 포함되어 있는지 확인합니다."""
    return bool(FOREIGN_CHAR_PATTERN.search(text))


def _iter_text_values(value: Any):
    if isinstance(value, str):
        yield value
        return

    if isinstance(value, list):
        for item in value:
            yield from _iter_text_values(item)
        return

    if isinstance(value, dict):
        for item in value.values():
            yield from _iter_text_values(item)


def _contains_unwanted_english(text: str) -> bool:
    """리포트 값에 자주 섞이는 영어 설명어가 포함되어 있는지 확인합니다."""
    def scrub_example_span(match: re.Match[str]) -> str:
        tokens = {token.lower() for token in LATIN_WORD_PATTERN.findall(match.group(0))}
        if tokens & ENGLISH_EXAMPLE_MARKERS:
            return " "
        return match.group(0)

    text_without_examples = ENGLISH_EXAMPLE_SPAN_PATTERN.sub(scrub_example_span, text)

    for match in LATIN_WORD_PATTERN.finditer(text_without_examples):
        token = match.group(0).strip("_-").lower()
        if token in UNWANTED_REPORT_ENGLISH_WORDS:
            return True
    return False


def _report_contains_unwanted_english(report: FinalReport) -> bool:
    """FinalReport 값에 불필요한 영어가 포함되어 있는지 확인합니다. JSON key는 검사하지 않습니다."""
    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    return any(_contains_unwanted_english(text) for text in _iter_text_values(report_dict))


def _report_contains_foreign_chars(report: FinalReport) -> bool:
    """FinalReport 전체에 한자/일본어/중국어 표기가 포함되어 있는지 확인합니다."""
    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    report_json = json.dumps(report_dict, ensure_ascii=False)
    return _contains_foreign_chars(report_json)


async def _remove_foreign_chars_and_parse_report_json(
    client: AsyncOpenAI,
    report: FinalReport,
) -> FinalReport:
    """FinalReport에 한자/일본어/중국어가 포함된 경우 한글 표기로 변환합니다."""
    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    report_json = json.dumps(report_dict, ensure_ascii=False)

    prompt = _build_remove_foreign_chars_prompt(report_json)

    response = await client.chat.completions.create(
        model=REPORT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=2048,
    )

    cleaned_text = response.choices[0].message.content or ""
    cleaned_data = _normalize_final_report_data(_parse_report_json(cleaned_text))
    return FinalReport(**cleaned_data)


async def _ensure_no_foreign_chars_in_report(
    client: AsyncOpenAI,
    report: FinalReport,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> FinalReport:
    """FinalReport에 한자/일본어/중국어가 포함되어 있으면 한글 변환 repair를 1회 시도합니다."""
    if not _report_contains_foreign_chars(report):
        return report

    print(
        "[WARN] 리포트에 한자/일본어/중국어 포함 감지. 한글 변환 repair 재시도 "
        f"session_id={session_id}, student_id={student_id}"
    )

    try:
        cleaned_report = await _remove_foreign_chars_and_parse_report_json(client, report)

        if _report_contains_foreign_chars(cleaned_report):
            print(
                "[ERROR] 한자/일본어/중국어 제거 repair 후에도 해당 문자 포함 감지. 원본 report 반환 "
                f"session_id={session_id}, student_id={student_id}"
            )
            return report

        return cleaned_report

    except Exception as repair_error:
        print(
            "[ERROR] 한자/일본어/중국어 제거 repair 실패. 원본 report 반환 "
            f"session_id={session_id}, student_id={student_id}, error={repair_error}"
        )
        return report


async def _remove_unwanted_english_and_parse_report_json(
    client: AsyncOpenAI,
    report: FinalReport,
) -> FinalReport:
    """FinalReport 값에 섞인 불필요한 영어를 한글 표현으로 변환합니다."""
    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    report_json = json.dumps(report_dict, ensure_ascii=False)

    response = await client.chat.completions.create(
        model=REPORT_MODEL,
        messages=[{"role": "user", "content": _build_remove_unwanted_english_prompt(report_json)}],
        temperature=0.0,
        max_tokens=4096,
    )

    cleaned_text = response.choices[0].message.content or ""
    cleaned_data = _normalize_final_report_data(_parse_report_json(cleaned_text))
    return FinalReport(**cleaned_data)


async def _ensure_no_unwanted_english_in_report(
    client: AsyncOpenAI,
    report: FinalReport,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> FinalReport:
    """FinalReport 값에 불필요한 영어가 포함되어 있으면 한글 변환 repair를 1회 시도합니다."""
    if not _report_contains_unwanted_english(report):
        return report

    print(
        "[WARN] 리포트에 불필요한 영어 표현 포함 감지. 한글 변환 repair 재시도 "
        f"session_id={session_id}, student_id={student_id}"
    )

    try:
        cleaned_report = await _remove_unwanted_english_and_parse_report_json(client, report)

        if _report_contains_unwanted_english(cleaned_report):
            print(
                "[ERROR] 영어 표현 제거 repair 후에도 불필요한 영어 포함 감지. 원본 report 반환 "
                f"session_id={session_id}, student_id={student_id}"
            )
            return report

        return cleaned_report

    except Exception as repair_error:
        print(
            "[ERROR] 영어 표현 제거 repair 실패. 원본 report 반환 "
            f"session_id={session_id}, student_id={student_id}, error={repair_error}"
        )
        return report


# ─────────────────────────────────────────────────────────────
# Repair / fallback
# ─────────────────────────────────────────────────────────────

async def _repair_and_parse_report_json(
    client: AsyncOpenAI,
    raw_text: str,
) -> FinalReport:
    """
    JSON 파싱에 실패했을 때 1회 repair prompt를 호출하여
    FinalReport로 복구합니다.
    """
    repair_prompt = _build_repair_json_prompt(raw_text)

    response = await client.chat.completions.create(
        model=REPORT_MODEL,
        messages=[{"role": "user", "content": repair_prompt}],
        temperature=0.0,
        max_tokens=4096,
    )

    repaired_text = response.choices[0].message.content or ""
    repaired_data = _normalize_final_report_data(_parse_report_json(repaired_text))
    return FinalReport(**repaired_data)


def _fallback_parse_error_report(raw_text: str) -> FinalReport:
    """파싱 및 repair까지 실패했을 때 반환할 fallback 리포트입니다."""
    preview = raw_text[:1000] if raw_text else "리포트 생성 중 오류가 발생했습니다."
    return FinalReport(
        key_concepts=_default_key_concepts(),
        misconception_summary=["없음"],
        session_summary="리포트 파싱 오류",
        detailed_report=(
            "## 리포트 생성 상태\n"
            "리포트 JSON 파싱 중 오류가 발생했습니다.\n\n"
            "## 원본 응답 일부\n"
            f"{preview}\n\n"
            "## 보완 필요 사항\n"
            "원본 대화 또는 LLM 응답 형식을 확인한 뒤 리포트를 다시 생성하는 것이 좋습니다."
        ),
    )


def _empty_student_report() -> FinalReport:
    """학생 발화가 없을 때 반환할 fallback 리포트입니다."""
    return FinalReport(
        key_concepts=_default_key_concepts(),
        misconception_summary=["없음"],
        session_summary="학생 발화 기록 없음",
        detailed_report=(
            "## 수업 흐름 요약\n"
            "이번 세션에서 학생의 학습 관련 발화 기록이 충분하지 않아 수업 흐름을 판단하기 어렵습니다.\n\n"
            "## 학생 강점\n"
            "대화 근거가 부족하여 뚜렷한 강점을 판단하기 어렵습니다.\n\n"
            "## 학생 취약점\n"
            "주요 개념, 오개념, 취약점을 판단할 학생 발화가 충분하지 않습니다.\n\n"
            "## 보완 지도 제안\n"
            "다음 세션에서는 개념 설명 후 확인 질문이나 짧은 문제 풀이를 통해 학생의 이해 상태를 확인하는 것이 좋습니다.\n\n"
            "## 다음 수업 확인 질문\n"
            "- 오늘 배운 개념을 네 말로 한 문장으로 설명해볼래?\n"
            "- 예문에서 어떤 성분이 빠졌는지 찾아볼래?"
        ),
    )


def _llm_call_failed_report() -> FinalReport:
    """LLM 호출 실패 시 반환할 fallback 리포트입니다."""
    return FinalReport(
        key_concepts=_default_key_concepts(),
        misconception_summary=["없음"],
        session_summary="리포트 생성 실패",
        detailed_report=(
            "## 리포트 생성 상태\n"
            "LLM 호출 중 오류가 발생하여 학생별 상세 리포트를 생성하지 못했습니다.\n\n"
            "## 보완 필요 사항\n"
            "네트워크, API 키, 모델 응답 상태를 확인한 뒤 리포트를 다시 생성하세요."
        ),
    )


# ─────────────────────────────────────────────────────────────
# LLM call helper
# ─────────────────────────────────────────────────────────────

async def _call_llm(
    client: AsyncOpenAI,
    prompt: str,
    max_tokens: int,
    temperature: float = 0.2,
    model: Optional[str] = None,
) -> str:
    """LLM 호출 공통 helper입니다."""
    response = await client.chat.completions.create(
        model=model or REPORT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content or ""


# ─────────────────────────────────────────────────────────────
# Main service
# ─────────────────────────────────────────────────────────────

async def generate_final_report(
    chat_messages: list[dict],
    realtime_summaries: Optional[list[dict]] = None,
    session_id: Optional[str] = None,
    student_id: Optional[str] = None,
) -> FinalReport:
    """
    원시 또는 정규화된 채팅 메시지 목록을 받아 최종 리포트를 생성합니다.

    처리 흐름:
      0. 메시지 정규화
      1. 채팅 메시지를 LLM용 대화 텍스트로 포맷팅
      2. 학생 메시지 존재 여부 확인
      3. 토큰 수 추정
      4. 짧은 세션 → 전체 원문 기반 1회 LLM 호출
         긴 세션  → chunk 분할 → 각 chunk 요약 → 최종 synthesis LLM 호출
      5. JSON 파싱 → FinalReport 검증
      6. 파싱 실패 시 repair 1회 재시도
      7. 한자 포함 시 한글 변환 repair 1회 재시도
      8. 불필요한 영어 포함 시 한글 변환 repair 1회 재시도
      9. 최종 실패 시 fallback FinalReport 반환
    """

    # ── realtime_summaries: 프롬프트 보조 컨텍스트로 활용 ────────────────────
    realtime_context = ""
    realtime_topic_candidates = _extract_realtime_topic_candidates(realtime_summaries)
    if realtime_summaries:
        # 이해도 변화, 반복 혼란, 감정 변화, 개입 필요 여부를 요약하여 프롬프트에 주입합니다.
        scores = [
            s.get("understanding_score")
            for s in realtime_summaries
            if s.get("understanding_score") is not None
        ]
        interventions = [s for s in realtime_summaries if s.get("need_intervention")]
        emotions = [s.get("student_emotion") for s in realtime_summaries if s.get("student_emotion")]

        lines = []
        if realtime_topic_candidates:
            lines.append(f"주요 학습 주제 후보(current_topic 기반): {', '.join(realtime_topic_candidates)}")
        if scores:
            lines.append(f"이해도 변화: {' → '.join(str(s) for s in scores)}")
        if emotions:
            lines.append(f"감정 흐름: {' → '.join(emotions)}")
        if interventions:
            lines.append(f"교사 개입 필요 발생 횟수: {len(interventions)}회")

        if lines:
            realtime_context = (
                "\n\n[실시간 분석 요약]\n"
                + "\n".join(f"- {l}" for l in lines)
                + "\n- main_concepts가 비어 있거나 ['없음']이 되려는 경우, 위 주요 학습 주제 후보를 우선 사용하세요."
            )

    # ── Step 0: 메시지 정규화 ───────────────────────────────────────────────
    normalized_messages = normalize_chat_messages(chat_messages)

    # ── Step 1: 대화 포맷팅 ────────────────────────────────────────────────
    conversation_text, has_student = _format_conversation(normalized_messages)

    # ── Step 2: 학생 메시지 존재 여부 확인 ────────────────────────────────
    if not has_student or not conversation_text.strip():
        print(
            "[WARN] 학생 메시지가 없습니다. "
            f"session_id={session_id}, student_id={student_id}"
        )
        return _empty_student_report()

    # ── Step 3: 토큰 수 추정 ───────────────────────────────────────────────
    estimated_tokens = _estimate_tokens(conversation_text)

    print(
        "[INFO] FinalReport generation start "
        f"session_id={session_id}, student_id={student_id}, "
        f"chars={len(conversation_text)}, estimated_tokens={estimated_tokens}"
    )

    client = _get_client()

    # ── Step 4: 짧은 세션 / 긴 세션 분기 ─────────────────────────────────
    try:
        if estimated_tokens <= SHORT_SESSION_TOKEN_THRESHOLD:
            print("[INFO] 짧은 세션 감지 → 전체 원문 기반 리포트 생성")

            prompt = _build_report_prompt(conversation_text, realtime_context=realtime_context)
            raw_text = await _call_llm(
                client=client,
                prompt=prompt,
                max_tokens=4096,
                temperature=0.2,
                model=NVIDIA_REPORT_FINAL_MODEL,
            )

        else:
            print("[INFO] 긴 세션 감지 → chunk summary 후 synthesis 리포트 생성")

            chunks = _split_into_chunks(conversation_text)
            print(f"[INFO] chunk count={len(chunks)}")

            chunk_summaries: list[str] = []

            for i, chunk in enumerate(chunks):
                summary_prompt = _build_chunk_summary_prompt(
                    chunk_text=chunk,
                    chunk_index=i,
                    total_chunks=len(chunks),
                )

                summary = await _call_llm(
                    client=client,
                    prompt=summary_prompt,
                    max_tokens=1024,
                    temperature=0.2,
                    model=NVIDIA_REPORT_SUMMARY_MODEL,
                )

                summary = summary.strip()

                # chunk summary도 JSON 형식이어야 합니다. 파싱이 실패하면 경고만 남기고 계속 진행합니다.
                try:
                    json.loads(_extract_json_object(summary))
                except (json.JSONDecodeError, ValueError):
                    print(f"[WARN] chunk summary {i + 1}/{len(chunks)} JSON 파싱 실패. 원본 텍스트로 진행.")

                chunk_summaries.append(summary)

                print(f"[INFO] chunk summary done {i + 1}/{len(chunks)}")

            synthesis_prompt = _build_synthesis_prompt(chunk_summaries, realtime_context=realtime_context)
            raw_text = await _call_llm(
                client=client,
                prompt=synthesis_prompt,
                max_tokens=4096,
                temperature=0.2,
                model=NVIDIA_REPORT_FINAL_MODEL,
            )

    except Exception as e:
        print(
            "[ERROR] LLM 호출 중 오류 발생 "
            f"session_id={session_id}, student_id={student_id}, error={e}"
        )
        return _llm_call_failed_report()

    # ── Step 5~8: JSON 파싱, repair retry, 한자 제거, fallback ─────────────
    try:
        data = _normalize_final_report_data(_parse_report_json(raw_text))
        data = _apply_realtime_topic_fallback(data, realtime_topic_candidates)
        report = FinalReport(**data)
        report = await _ensure_no_foreign_chars_in_report(
            client=client,
            report=report,
            session_id=session_id,
            student_id=student_id,
        )
        report = await _ensure_no_unwanted_english_in_report(
            client=client,
            report=report,
            session_id=session_id,
            student_id=student_id,
        )
        return report

    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(
            "[WARN] 리포트 JSON 1차 파싱 실패. repair 재시도 "
            f"session_id={session_id}, student_id={student_id}, error={e}, "
            f"raw_preview={raw_text[:300]}"
        )

        try:
            report = await _repair_and_parse_report_json(client, raw_text)
            report_data = report.model_dump() if hasattr(report, "model_dump") else report.dict()
            report = FinalReport(**_apply_realtime_topic_fallback(report_data, realtime_topic_candidates))
            report = await _ensure_no_foreign_chars_in_report(
                client=client,
                report=report,
                session_id=session_id,
                student_id=student_id,
            )
            report = await _ensure_no_unwanted_english_in_report(
                client=client,
                report=report,
                session_id=session_id,
                student_id=student_id,
            )
            return report

        except Exception as repair_error:
            print(
                "[ERROR] 리포트 JSON repair 실패 "
                f"session_id={session_id}, student_id={student_id}, "
                f"error={repair_error}, raw_preview={raw_text[:300]}"
            )
            return _fallback_parse_error_report(raw_text)
