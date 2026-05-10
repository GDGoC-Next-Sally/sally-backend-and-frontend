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


# ─────────────────────────────────────────────────────────────
# 환경 설정
# ─────────────────────────────────────────────────────────────

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

REPORT_MODEL = "meta/llama-3.3-70b-instruct"

# 짧은 세션 기준 추정 토큰 수
# rough estimate: 약 4글자 = 1토큰
SHORT_SESSION_TOKEN_THRESHOLD = 6000
CHARS_PER_TOKEN = 4

# 긴 세션 chunk 분할 기준
CHUNK_MAX_CHARS = 8000


# ─────────────────────────────────────────────────────────────
# OpenAI-compatible NVIDIA client
# ─────────────────────────────────────────────────────────────

def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")

    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
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
        "role": "student" | "assistant",
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
            or msg.get("sender")
            or msg.get("sender_type")
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

        role_str = str(raw_role).strip().lower() if raw_role is not None else ""

        if role_str in {
            "user",
            "student",
            "learner",
            "human",
            "학생",
            "student_user",
        }:
            normalized_role = "student"
        elif role_str in {
            "assistant",
            "ai",
            "tutor",
            "sally",
            "bot",
            "system_ai",
        }:
            normalized_role = "assistant"
        elif role_str.upper() == "STUDENT":
            normalized_role = "student"
        elif role_str.upper() == "AI":
            normalized_role = "assistant"
        else:
            # teacher/system/unknown 등은 최종 학생 리포트 근거로 사용하지 않음
            # 필요하면 여기에서 teacher를 별도 보존하도록 확장 가능
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

    프롬프트의 판단 기준과 맞추기 위해 role tag는 반드시
    [student], [assistant]로 통일합니다.

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
            lines.append(f"[student] {content}")
            has_student = True
        elif role == "assistant":
            lines.append(f"[assistant] {content}")
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
def _build_report_prompt(conversation_text: str) -> str:
    """전체 대화 기반 최종 리포트 생성 프롬프트를 생성합니다."""
    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 학생과 AI 튜터 Sally가 진행한 한 세션의 채팅 기록입니다.
이 대화를 바탕으로 교사용 학생별 최종 리포트를 생성하세요.
선생님 관점에서 비판적으로 평가하세요.

리포트 목적:
- 세션 주요 학습 주제와 학생의 최종 취약 개념을 정리합니다.
- 세션 종료 시점에도 남아 있는 오개념과 구체적 약점을 요약합니다.
- 교사가 빠르게 볼 수 있는 세션 상태 요약과 상세 줄글 리포트를 생성합니다.

핵심 판단 원칙:
- 최종 리포트는 세션 중간의 일시적 오류가 아니라, 세션 종료 시점의 이해 상태를 기준으로 작성하세요.
- 학생의 이해 상태와 오개념은 반드시 [student] 발화를 중심으로 판단하세요.
- [assistant]의 설명을 학생이 이해한 것으로 간주하지 마세요.
- 초반에 오개념이 있었더라도 이후 학생이 스스로 정정했거나 올바르게 이해한 근거가 있으면 최종 오개념·약점으로 분류하지 마세요.
- 해결된 오개념은 misconception_summary에 넣지 말고, detailed_report에서 이해 변화로 설명하세요.
- 마지막까지 이해했는지 근거가 부족하면 해결됐다고 단정하지 말고 추가 확인이 필요하다고 표현하세요.
- 취약 개념, 오개념, 약점이 실제 대화에서 확인되지 않으면 지어내지 말고 ["없음"]으로 작성하세요.
- 긍정 평가와 부정 평가는 실제 대화에서 확인된 근거 비율을 반영하세요.
- 학생을 비난하거나 낙인찍지 말고, 교사가 지도에 참고할 수 있는 표현으로 작성하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 수치형 지표는 포함하지 마세요.
- 출력은 반드시 JSON 형식으로만 작성하고, 마크다운/코드블록/설명문은 출력하지 마세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

출력 형식:
{{
  "key_concepts": ["string"],
  "misconception_summary": ["string"],
  "session_summary": "string",
  "detailed_report": "string"
}}

필드 작성 기준:
1. key_concepts = 주요/취약 개념
- 세션에서 다룬 주요 학습 주제와 세션 종료 시점에도 추가 지도가 필요한 취약 개념을 짧은 명사구 배열로 작성하세요.
- 초반에 어려워했더라도 이후 이해한 근거가 있으면 취약 개념으로 분류하지 마세요.
- 단, 세션의 주요 학습 주제라면 포함할 수 있습니다.
- 주요 학습 주제나 취약 개념이 모두 명확하지 않으면 ["없음"]으로 작성하세요.
- 주요 학습 주제와 취약 개념 나눠서 작성하세요.
- {{ "주요 학습 개념": "", "취약 개념": ""}} 이 형태로 출력하세요. 

2. misconception_summary = 오개념·약점 요약
- 세션 종료 시점까지 남아 있는 오개념, 해결되지 않은 혼란, 여전히 남은 풀이 약점을 구체적인 문장 배열로 작성하세요.
- 단순히 "개념 이해 부족"처럼 추상적으로 쓰지 말고, 무엇을 어떻게 잘못 이해했는지 작성하세요.
- 초반 오개념이 이후 해결되었다면 이 필드에 포함하지 마세요.
- 최종적으로 남은 오개념이나 약점이 명확하지 않으면 ["없음"]으로 작성하세요.

3. session_summary = 세션 상태 요약
- 교사용 한 줄 요약입니다.
- 세션 종료 시점 기준의 학습 상태, 확인된 강점, 남은 취약점, 다음 지도 필요성을 80자 이내 1문장으로 작성하세요.

4. detailed_report = AI가 생성하는 줄글 형식 리포트
- 세션에서 다룬 내용, 학생의 이해 수준, 확인된 장점, 해결된 혼란, 마지막까지 남은 약점, 다음 지도 방향을 자연스러운 하나의 문단으로 작성하세요.
- 긍정/부정 평가는 실제 대화의 근거 비율을 반영하세요.
- 오개념이나 약점이 확인되지 않았다면 "뚜렷한 오개념은 확인되지 않았습니다"라고 작성하세요.
- 세션 내용이 복잡하면 6~10문장까지 작성할 수 있습니다.
- 줄바꿈 없이 하나의 문단으로 작성하세요.

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
- 줄글 리포트에 반영할 이해 변화, 장점, 약점, 다음 지도 방향

중요:
- 학생의 이해 상태와 오개념은 반드시 [student] 발화를 중심으로 판단하세요.
- [assistant]의 설명을 학생이 이해한 것으로 간주하지 마세요.
- [assistant]가 설명한 내용은 다룬 개념으로 볼 수는 있지만, 학생이 이해한 내용으로 단정하지 마세요.
- 반복되는 혼란, 오개념, 풀이 막힘을 중심으로 요약하되, 이 chunk 안에서 해결되었는지도 함께 확인하세요.
- 세션 초반이나 chunk 초반에 나타난 오개념이라도, 이후 학생 발화에서 정정되거나 이해가 개선된 근거가 있으면 resolved_confusions에 기록하세요.
- 근거가 되는 핵심 학생 발화를 함께 남기세요.
- 근거가 부족한 내용은 추측하지 말고 빈 배열 또는 "판단하기 어려움"으로 표시하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 한 번만 나온 단순 실수는 반복 오개념처럼 과장하지 마세요.
- 취약 개념, 오개념, 약점이 실제 대화에서 확인되지 않으면 절대 지어내지 마세요.
- 긍정적 요소와 부정적 요소를 모두 확인하고, 실제 대화의 근거 비율에 맞게 요약하세요.
- 출력은 반드시 JSON 형식으로만 작성하세요.
- 마크다운, 코드블록, 설명문, 주석은 출력하지 마세요.

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
- student_confusions: 이 chunk에서 학생이 헷갈려 한 부분을 구체적인 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- misconceptions: 이 chunk에서 학생 발화에 드러난 잘못된 이해나 오개념 후보를 문장 배열로 작성하세요. 단, 같은 chunk 안에서 이후 해결된 경우에는 resolved_confusions에도 반드시 기록하세요. 확인되지 않으면 []로 작성하세요.
- weak_steps: 문제 풀이, 개념 적용, 설명 이해 과정에서 학생이 막힌 단계를 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- resolved_confusions: 이 chunk 안에서 초반에는 헷갈렸지만 이후 학생 발화에서 정정되었거나 이해가 개선된 것으로 확인되는 내용을 작성하세요. 확인되지 않으면 []로 작성하세요.
- evidence_student_utterances: 위 판단의 근거가 되는 핵심 [student] 발화 원문을 그대로 배열로 남기세요. 확인되지 않으면 []로 작성하세요.
- positive_observations: 학생이 잘 이해한 부분, 스스로 정정한 부분, 개선된 부분, 적절히 답한 부분을 문장 배열로 작성하세요. 확인되지 않으면 []로 작성하세요.
- progress: 이 chunk 안에서 보인 이해 변화, 장점, 개선 흐름, 또는 여전히 남은 어려움을 1문장으로 작성하세요. 판단하기 어렵다면 "판단하기 어려움"이라고 작성하세요.

작성 규칙:
- 해당 항목이 대화에서 확인되지 않으면 빈 배열 []로 출력하세요.
- 학생 발화에서 직접 확인되지 않는 오개념은 만들지 마세요.
- [assistant]가 설명한 개념을 main_topics에는 포함할 수 있지만, 학생이 이해했다고 단정하지 마세요.
- evidence_student_utterances에는 [assistant] 발화를 넣지 마세요.
- 동일한 의미의 항목은 중복해서 작성하지 마세요.
- 긍정적 평가와 부정적 평가는 실제 대화에서 확인된 근거의 비율을 반영하세요.
- 해결된 오개념이나 정정된 혼란은 misconceptions에만 남기지 말고 resolved_confusions에도 기록하세요.
- 모든 내용은 한국어로 작성하세요.

대화 chunk:
{chunk_text}
"""

def _build_synthesis_prompt(chunk_summaries: list[str]) -> str:
    """chunk 요약들을 합쳐 최종 리포트를 만드는 프롬프트를 생성합니다."""
    summaries_text = "\n\n".join(
        f"[{i + 1}번째 파트 요약]\n{s}" for i, s in enumerate(chunk_summaries)
    )

    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 학생과 AI 튜터 Sally가 진행한 긴 학습 세션을 파트별로 요약한 내용입니다.
파트별 요약을 시간 순서대로 종합하여 교사용 학생별 최종 리포트를 생성하세요.

리포트 목적:
- 세션 주요 학습 주제와 학생의 최종 취약 개념을 정리합니다.
- 세션 종료 시점에도 남아 있는 오개념과 구체적 약점을 요약합니다.
- 교사가 빠르게 볼 수 있는 세션 상태 요약과 상세 줄글 리포트를 생성합니다.

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
- 출력은 반드시 JSON 형식으로만 작성하고, 마크다운/코드블록/설명문은 출력하지 마세요.
- JSON에는 key_concepts, misconception_summary, session_summary, detailed_report 4개 필드만 포함하세요.

파트별 요약 활용 기준:
- main_topics는 key_concepts 후보로 활용하세요.
- student_confusions, misconceptions, weak_steps는 최종 약점 후보로 보되, 후반부에서 해결되었는지 확인하세요.
- resolved_confusions는 최종 misconception_summary에서 제외해야 할 해결된 혼란 후보로 활용하세요.
- positive_observations와 progress는 detailed_report에서 장점과 이해 변화 설명에 활용하세요.
- evidence_student_utterances는 판단 근거로만 참고하고, 최종 리포트에 과도하게 나열하지 마세요.

출력 형식:
{{
  "key_concepts": ["string"],
  "misconception_summary": ["string"],
  "session_summary": "string",
  "detailed_report": "string"
}}

필드 작성 기준:
1. key_concepts = 주요/취약 개념
- 세션에서 다룬 주요 학습 주제와 세션 종료 시점에도 추가 지도가 필요한 취약 개념을 짧은 명사구 배열로 작성하세요.
- 초반 또는 중간에 어려워했더라도 후반부에서 이해한 근거가 있으면 취약 개념으로 분류하지 마세요.
- 단, 세션의 주요 학습 주제라면 포함할 수 있습니다.
- 주요 학습 주제나 취약 개념이 모두 명확하지 않으면 ["없음"]으로 작성하세요.
- 주요 학습 주제와 취약 개념 나눠서 작성하세요.
- {{ "주요 학습 개념": "", "취약 개념": ""}} 이 형태로 출력하세요. 

2. misconception_summary = 오개념·약점 요약
- 세션 종료 시점까지 남아 있는 오개념, 해결되지 않은 혼란, 여전히 남은 풀이 약점을 구체적인 문장 배열로 작성하세요.
- 단순히 "개념 이해 부족"처럼 추상적으로 쓰지 말고, 무엇을 어떻게 잘못 이해했는지 작성하세요.
- 앞 파트의 오개념이 뒤 파트에서 해결되었다면 이 필드에 포함하지 마세요.
- 최종적으로 남은 오개념이나 약점이 명확하지 않으면 ["없음"]으로 작성하세요.

3. session_summary = 세션 상태 요약
- 교사용 한 줄 요약입니다.
- 세션 종료 시점 기준의 학습 상태, 확인된 강점, 남은 취약점, 다음 지도 필요성을 80자 이내 1문장으로 작성하세요.

4. detailed_report = AI가 생성하는 줄글 형식 리포트
- 세션에서 다룬 내용, 학생의 이해 수준, 확인된 장점, 해결된 혼란, 마지막까지 남은 약점, 다음 지도 방향을 자연스러운 하나의 문단으로 작성하세요.
- 긍정/부정 평가는 파트별 요약의 근거 비율을 반영하세요.
- 오개념이나 약점이 확인되지 않았다면 "뚜렷한 오개념은 확인되지 않았습니다"라고 작성하세요.
- 세션 내용이 복잡하면 6~10문장까지 작성할 수 있습니다.
- 줄바꿈 없이 하나의 문단으로 작성하세요.

파트별 요약:
{summaries_text}
"""


def _build_repair_json_prompt(raw_text: str) -> str:
    """깨진 JSON 응답을 FinalReport 스키마 JSON으로 복구하는 프롬프트를 생성합니다."""
    return f"""아래 텍스트를 유효한 JSON으로만 변환하세요.

반드시 다음 4개 필드만 포함하세요.
- key_concepts: string[]
- misconception_summary: string[]
- session_summary: string
- detailed_report: string

규칙:
- 마크다운, 코드블록, 설명문, 주석은 출력하지 마세요.
- JSON 객체 하나만 출력하세요.
- 필드가 없거나 판단하기 어려운 경우 key_concepts와 misconception_summary는 빈 배열 []로 두세요.
- session_summary와 detailed_report가 없으면 주어진 텍스트를 바탕으로 짧게 생성하세요.
- 모든 내용은 한국어로 작성하세요.

변환할 텍스트:
{raw_text}
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
    MVP 수준에서는 첫 번째 '{'부터 마지막 '}'까지 추출합니다.
    """
    text = _strip_code_fence(raw_text)

    # 제어 문자 제거
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        return text

    return text[start:end + 1]


def _normalize_key_concepts(raw: Any) -> dict:
    """
    LLM이 key_concepts를 list로 반환하는 경우를 dict로 정규화합니다.

    기대 형태: {"주요 학습 개념": "...", "취약 개념": "..."}
    fallback:  LLM이 list를 반환하면 {"주요 학습 개념": ", ".join(raw), "취약 개념": ""} 으로 변환
    """
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list):
        # list인 경우 전체를 "주요 학습 개념"으로 넣고 취약 개념은 빈 문자열
        return {
            "주요 학습 개념": ", ".join(str(v) for v in raw),
            "취약 개념": "",
        }
    return {"주요 학습 개념": str(raw) if raw else "", "취약 개념": ""}


def _parse_report_json(raw_text: str) -> dict[str, Any]:
    """LLM 응답에서 FinalReport JSON을 추출하고 파싱합니다."""
    json_text = _extract_json_object(raw_text)
    data = json.loads(json_text)

    # key_concepts 타입 정규화 (LLM이 list로 반환하는 경우 방어)
    if "key_concepts" in data:
        data["key_concepts"] = _normalize_key_concepts(data["key_concepts"])

    return data



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
        max_tokens=2048,
    )

    repaired_text = response.choices[0].message.content or ""
    repaired_data = _parse_report_json(repaired_text)
    return FinalReport(**repaired_data)


def _fallback_parse_error_report(raw_text: str) -> FinalReport:
    """파싱 및 repair까지 실패했을 때 반환할 fallback 리포트입니다."""
    return FinalReport(
        key_concepts={},
        misconception_summary=[],
        session_summary="리포트 파싱 오류",
        detailed_report=(
            raw_text[:1000]
            if raw_text
            else "리포트 생성 중 오류가 발생했습니다."
        ),
    )


def _empty_student_report() -> FinalReport:
    """학생 발화가 없을 때 반환할 fallback 리포트입니다."""
    return FinalReport(
        key_concepts={},
        misconception_summary=[],
        session_summary="학생 발화 기록 없음",
        detailed_report=(
            "이번 세션에서 학생의 학습 관련 발화 기록이 충분하지 않아 "
            "주요 개념, 오개념, 취약점을 판단하기 어렵습니다. "
            "다음 세션에서는 개념 설명 후 확인 질문이나 짧은 문제 풀이를 통해 "
            "학생의 이해 상태를 확인하는 것이 좋습니다."
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
) -> str:
    """LLM 호출 공통 helper입니다."""
    response = await client.chat.completions.create(
        model=REPORT_MODEL,
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
      7. 최종 실패 시 fallback FinalReport 반환
    """

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

            prompt = _build_report_prompt(conversation_text)
            raw_text = await _call_llm(
                client=client,
                prompt=prompt,
                max_tokens=2048,
                temperature=0.2,
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
                )

                summary = summary.strip()
                chunk_summaries.append(summary)

                print(f"[INFO] chunk summary done {i + 1}/{len(chunks)}")

            synthesis_prompt = _build_synthesis_prompt(chunk_summaries)
            raw_text = await _call_llm(
                client=client,
                prompt=synthesis_prompt,
                max_tokens=2048,
                temperature=0.2,
            )

    except Exception as e:
        print(
            "[ERROR] LLM 호출 중 오류 발생 "
            f"session_id={session_id}, student_id={student_id}, error={e}"
        )
        return FinalReport(
            key_concepts={},
            misconception_summary=[],
            session_summary="리포트 생성 실패",
            detailed_report="LLM 호출 중 오류가 발생하여 리포트를 생성하지 못했습니다.",
        )

    # ── Step 5~7: JSON 파싱, repair retry, fallback ────────────────────────
    try:
        data = _parse_report_json(raw_text)
        return FinalReport(**data)

    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(
            "[WARN] 리포트 JSON 1차 파싱 실패. repair 재시도 "
            f"session_id={session_id}, student_id={student_id}, error={e}, "
            f"raw_preview={raw_text[:300]}"
        )

        try:
            return await _repair_and_parse_report_json(client, raw_text)

        except Exception as repair_error:
            print(
                "[ERROR] 리포트 JSON repair 실패 "
                f"session_id={session_id}, student_id={student_id}, "
                f"error={repair_error}, raw_preview={raw_text[:300]}"
            )
            return _fallback_parse_error_report(raw_text)