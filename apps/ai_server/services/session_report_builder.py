"""
services/session_report_builder.py — 세션별 전체 학생 리포트 생성 서비스

입력은 학생별 채팅 기록 묶음이고, 출력은 교사용 반 전체 요약 JSON입니다.
DB 저장이나 세션 종료 훅은 이 모듈의 책임이 아닙니다.
"""

import asyncio
import json
import re
from typing import Optional, Any

from openai import AsyncOpenAI

from ai_server.models import SessionAggregateReport, StudentSessionChat
from ai_server.services.message_formatting import clean_speaker_label, format_labeled_message
from ai_server.services.report_builder import (
    CHUNK_MAX_CHARS,
    LANGUAGE_RULE,
    REPORT_MODEL,
    _call_llm,
    _contains_foreign_chars,
    _estimate_tokens,
    _get_client,
    _parse_report_json,
    normalize_chat_messages,
)


SESSION_REPORT_TOKEN_THRESHOLD = 6000
SESSION_REPORT_MAX_CHARS = CHUNK_MAX_CHARS
SESSION_REPORT_SYNTHESIS_MAX_CHARS = 12000
SESSION_REPORT_SUMMARY_BATCH_MAX_CHARS = 9000
SESSION_REPORT_LLM_MAX_ATTEMPTS = 3
SESSION_REPORT_MAX_KEY_QUESTIONS = 5

SEMANTIC_GROUP_PRIORITY = {
    "broad_role_omission": 0,
    "subject_object_case": 1,
    "preposition_omission": 2,
    "object_case_omission": 3,
    "pronoun_repetition": 4,
    "who_which_selection": 5,
    "antecedent": 6,
    "relative_adverb": 20,
    "other": 99,
}

GENERIC_REPORT_WORDS = {
    "관계대명사",
    "관계대명사의",
    "어떻게",
    "무엇",
    "무엇인가요",
    "구분",
    "기준",
    "경우",
    "조건",
    "역할",
    "사용",
    "문장",
    "뒤",
    "절",
    "에서",
    "때",
    "수",
    "있나요",
    "있나요?",
    "하나요",
    "하나요?",
    "인가요",
    "인가요?",
}


def _is_rate_limit_error(error: Exception) -> bool:
    status_code = getattr(error, "status_code", None)
    if status_code == 429:
        return True

    return "429" in str(error) or "Too Many Requests" in str(error)


async def _call_session_llm(
    *,
    client: AsyncOpenAI,
    prompt: str,
    max_tokens: int,
    temperature: float,
    session_id: Optional[str] = None,
    stage: str = "session_report",
) -> str:
    for attempt in range(1, SESSION_REPORT_LLM_MAX_ATTEMPTS + 1):
        try:
            return await _call_llm(
                client=client,
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as error:
            should_retry = (
                attempt < SESSION_REPORT_LLM_MAX_ATTEMPTS
                and _is_rate_limit_error(error)
            )

            if not should_retry:
                raise

            delay_seconds = 2 ** attempt
            print(
                "[WARN] session report LLM rate limited. retrying "
                f"session_id={session_id}, stage={stage}, "
                f"attempt={attempt}/{SESSION_REPORT_LLM_MAX_ATTEMPTS}, "
                f"sleep={delay_seconds}s"
            )
            await asyncio.sleep(delay_seconds)

    raise RuntimeError("session report LLM retry exhausted")


def _student_label(student: StudentSessionChat, index: int) -> str:
    return clean_speaker_label(student.student_name) or f"학생 {index + 1}"


def _format_student_conversation(
    student: StudentSessionChat,
    index: int,
) -> tuple[str, bool]:
    normalized_messages = normalize_chat_messages(student.chat_messages)
    label = _student_label(student, index)
    lines = [f"[학생 구분] {label}"]
    has_student_message = False

    for msg in normalized_messages:
        role = msg.get("role", "")
        content = str(msg.get("content", "")).strip()

        if not content:
            continue

        if role == "student":
            lines.append(
                format_labeled_message(
                    content,
                    "STUDENT",
                    default_student_label=label,
                    speaker_name=msg.get("speaker_name"),
                )
            )
            has_student_message = True
        elif role == "assistant":
            lines.append(format_labeled_message(content, "AI"))
        elif role == "teacher":
            lines.append(format_labeled_message(content, "TEACHER"))
        elif role == "system":
            lines.append(format_labeled_message(content, "SYSTEM"))

    return "\n".join(lines), has_student_message


def _format_session_conversations(students: list[StudentSessionChat]) -> tuple[str, int]:
    blocks: list[str] = []
    included_student_count = 0

    for index, student in enumerate(students):
        block, has_student_message = _format_student_conversation(student, index)

        if not has_student_message:
            continue

        blocks.append(block)
        included_student_count += 1

    return "\n\n".join(blocks), included_student_count


def _split_long_block(block: str, chunk_max_chars: int) -> list[str]:
    lines = block.split("\n")
    chunks: list[str] = []
    current_lines: list[str] = []
    current_len = 0

    for line in lines:
        line_len = len(line) + 1

        if line_len > chunk_max_chars:
            if current_lines:
                chunks.append("\n".join(current_lines))
                current_lines = []
                current_len = 0

            for start in range(0, len(line), chunk_max_chars):
                chunks.append(line[start:start + chunk_max_chars])
            continue

        if current_len + line_len > chunk_max_chars and current_lines:
            chunks.append("\n".join(current_lines))
            current_lines = [line]
            current_len = line_len
        else:
            current_lines.append(line)
            current_len += line_len

    if current_lines:
        chunks.append("\n".join(current_lines))

    return chunks


def _split_session_blocks(text: str, chunk_max_chars: int = SESSION_REPORT_MAX_CHARS) -> list[str]:
    blocks = text.split("\n\n")
    chunks: list[str] = []
    current_blocks: list[str] = []
    current_len = 0

    for block in blocks:
        if len(block) > chunk_max_chars:
            if current_blocks:
                chunks.append("\n\n".join(current_blocks))
                current_blocks = []
                current_len = 0

            chunks.extend(_split_long_block(block, chunk_max_chars))
            continue

        block_len = len(block) + 2

        if current_len + block_len > chunk_max_chars and current_blocks:
            chunks.append("\n\n".join(current_blocks))
            current_blocks = [block]
            current_len = block_len
        else:
            current_blocks.append(block)
            current_len += block_len

    if current_blocks:
        chunks.append("\n\n".join(current_blocks))

    return chunks


def _split_text_items(items: list[str], max_chars: int) -> list[list[str]]:
    batches: list[list[str]] = []
    current_batch: list[str] = []
    current_len = 0

    for item in items:
        item_len = len(item) + 2

        if current_len + item_len > max_chars and current_batch:
            batches.append(current_batch)
            current_batch = [item]
            current_len = item_len
        else:
            current_batch.append(item)
            current_len += item_len

    if current_batch:
        batches.append(current_batch)

    return batches


def _build_session_report_prompt(conversation_text: str, included_student_count: int) -> str:
    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 세션에서 여러 학생과 AI 튜터 Sally가 진행한 채팅 기록입니다.
이 대화를 바탕으로 세션별 전체 학생 리포트를 생성하세요.

리포트 목적:
- 교사가 반 전체 학습 상태를 빠르게 이해할 수 있게 요약합니다.
- 학생들이 실제로 많이 묻거나 반복해서 확인한 질문을 정리합니다.
- 여러 학생 발화에서 반복 확인된 취약 개념을 최대 5개로 정리합니다.

핵심 판단 원칙:
- 학생의 이해 상태와 취약 개념은 반드시 학생 이름 또는 학생 라벨로 표시된 발화를 중심으로 판단하세요.
- AI 선생님의 설명을 학생들이 이해한 것으로 간주하지 마세요.
- "선생님 지시:"는 교사가 AI에게 백그라운드로 전달한 비공개 지도 방향입니다. 학생 발화가 아니므로 반 전체 이해도, 주요 질문, 취약 개념의 직접 근거로 사용하지 마세요.
- 선생님 지시는 수업 중 어떤 지도 전략이 요청되었는지 이해하는 보조 맥락으로만 사용하세요.
- 한 학생에게만 잠깐 나온 단순 실수는 반 전체 취약 개념처럼 과장하지 마세요.
- 여러 학생에게 반복되거나, 한 학생이라도 세션 내내 해결되지 않은 핵심 취약점만 우선하세요.
- 학습과 관련 없는 잡담은 핵심 근거로 사용하지 마세요.
- 특정 학생을 낙인찍는 표현을 피하고, 반 전체 지도에 참고할 수 있는 표현으로 작성하세요.
- 근거가 부족하면 배열 필드는 ["없음"]으로 작성하세요.
- 출력은 반드시 JSON 형식으로만 작성하고, 마크다운/코드블록/설명문은 출력하지 마세요.
- JSON에는 class_summary, key_questions, weak_concepts_top5 3개 필드만 포함하세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "class_summary": "string",
  "key_questions": ["string"],
  "weak_concepts_top5": ["string"]
}}

필드 작성 기준:
1. class_summary = 반 전체 상태 요약
- 전체 {included_student_count}명 학생의 발화를 종합해 반 전체 이해 상태, 반복 질문, 다음 지도 방향을 1~2문장으로 작성하세요.
- 수치형 점수나 학생별 순위는 포함하지 마세요.

2. key_questions = 주요 질문 문장들
- 학생들이 실제로 묻거나 확인한 핵심 질문을 자연스러운 한국어 질문 문장 배열로 요약하세요.
- 원문을 그대로 길게 복사하지 말고, 같은 의미의 질문은 하나로 합치세요.
- AI 선생님 설명을 질문처럼 바꾸어 넣지 마세요.
- 학생이 "헷갈려요", "모르겠어요"처럼 혼란을 진술한 경우에는 "어떻게 구분하나요?", "왜 그런가요?"처럼 실제 확인하고 싶은 질문으로 재작성하세요.
- 각 항목은 반드시 질문 문장으로 작성하고, 마침표로 끝나는 설명문은 넣지 마세요.
- 학습 질문이 명확하지 않으면 ["없음"]으로 작성하세요.

3. weak_concepts_top5 = 취약개념 TOP 5
- 여러 학생 발화에서 반복 확인된 취약 개념을 중요도 순서로 최대 5개까지 짧은 명사구 배열로 작성하세요.
- 한 학생이 한 번만 언급한 곁가지 주제나 다음 단원 예고성 질문은 TOP 5에 넣지 마세요.
- 단, 한 학생에게만 나타났더라도 세션 후반까지 명시적으로 "약점", "어렵다", "추가 연습 필요"라고 남은 핵심 취약점은 포함할 수 있습니다.
- 취약 개념명은 "관계대명사의 주격과 목적격 구분"처럼 수업 목표와 직접 연결된 표현으로 작성하세요.
- 예를 들어 수업 목표가 관계대명사인데 한 학생이 "관계부사도 헷갈릴 것 같다"처럼 한 번만 언급했다면, 이는 주요 질문이나 취약개념 TOP 5에 넣지 마세요.
- 취약 개념이 실제 대화에서 확인되지 않으면 ["없음"]으로 작성하세요.

채팅 기록:
{conversation_text}
"""


def _build_session_chunk_summary_prompt(
    chunk_text: str,
    chunk_index: int,
    total_chunks: int,
) -> str:
    return f"""당신은 긴 반 전체 채팅 기록을 세션별 전체 학생 리포트 생성에 사용할 수 있도록 요약하는 학습 분석 AI입니다.

아래는 여러 학생과 AI 튜터 Sally의 학습 대화 중 {chunk_index + 1}/{total_chunks}번째 부분입니다.
이 chunk에서 최종 반 전체 리포트에 필요한 정보만 한국어 JSON으로 요약하세요.

중요:
- 학생의 이해 상태와 취약 개념은 반드시 학생 이름 또는 학생 라벨로 표시된 발화 중심으로 판단하세요.
- AI 선생님 설명만 보고 학생이 이해했다고 단정하지 마세요.
- AI 선생님 설명을 주요 질문으로 바꾸지 마세요.
- "선생님 지시:"는 AI용 비공개 지도 방향이며 학생 발화가 아닙니다. 주요 질문이나 취약 개념 근거로 사용하지 마세요.
- 학생의 혼란 진술은 실제 확인하려는 질문 문장으로 재작성할 수 있습니다.
- 반복 질문, 공통 혼란, 해결되지 않은 취약 개념 후보를 중심으로 요약하세요.
- 학습과 관련 없는 잡담은 제외하세요.
- 출력은 JSON 객체 하나만 작성하세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "chunk_index": {chunk_index + 1},
  "total_chunks": {total_chunks},
  "class_state_observations": ["string"],
  "key_questions": ["string"],
  "weak_concept_candidates": ["string"],
  "resolved_or_improved_points": ["string"]
}}

대화 chunk:
{chunk_text}
"""


def _build_session_synthesis_prompt(chunk_summaries: list[str]) -> str:
    summaries_text = "\n\n".join(
        f"[{i + 1}번째 파트 요약]\n{summary}"
        for i, summary in enumerate(chunk_summaries)
    )

    return f"""당신은 교사를 돕는 학습 분석 AI입니다.

아래는 한 세션의 여러 학생 채팅 기록을 파트별로 요약한 내용입니다.
파트별 요약을 종합하여 세션별 전체 학생 리포트를 생성하세요.

핵심 판단 원칙:
- 반복 질문과 공통 취약 개념을 우선합니다.
- 뒤 파트에서 해결된 혼란은 최종 취약 개념으로 과장하지 마세요.
- 특정 학생을 낙인찍는 표현을 피하고, 반 전체 지도 방향으로 작성하세요.
- 출력은 반드시 JSON 형식으로만 작성하고, 마크다운/코드블록/설명문은 출력하지 마세요.
- JSON에는 class_summary, key_questions, weak_concepts_top5 3개 필드만 포함하세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "class_summary": "string",
  "key_questions": ["string"],
  "weak_concepts_top5": ["string"]
}}

필드 작성 기준:
- class_summary: 반 전체 상태, 반복 질문, 다음 지도 방향을 1~2문장으로 작성하세요.
- key_questions: 학생 발화에 근거한 주요 질문을 자연스러운 한국어 질문 문장 배열로 요약하세요. 최대 5개까지 작성하고, 같은 개념의 예문별 질문은 더 일반적인 질문 하나로 합치세요. AI 선생님 설명을 질문처럼 바꾸지 말고, 학생의 혼란 진술만 질문형으로 재작성하세요. 한 번 나온 곁가지 주제나 다음 단원 예고성 질문은 제외하세요. 없으면 ["없음"]으로 작성하세요.
- weak_concepts_top5: 중요도 순으로 최대 5개의 짧은 명사구를 작성하세요. 여러 학생에게 반복되거나 세션 후반까지 남은 핵심 약점만 포함하고, 한 번 나온 곁가지 주제는 제외하세요. 서로 포함 관계인 취약 개념은 더 넓은 개념 하나로 합치세요. 예를 들어 "뒤 절에서 빠진 성분 확인"은 "관계대명사의 주격과 목적격 구분"과 별도 항목으로 중복 나열하지 마세요. 수업 목표가 관계대명사인데 "관계부사"가 한 번만 언급된 경우처럼 인접 단원의 단발성 언급은 제외하세요. 없으면 ["없음"]으로 작성하세요.

파트별 요약:
{summaries_text}
"""


def _build_session_rollup_prompt(
    summaries: list[str],
    batch_index: int,
    total_batches: int,
) -> str:
    summaries_text = "\n\n".join(
        f"[요약 {i + 1}]\n{summary}"
        for i, summary in enumerate(summaries)
    )

    return f"""당신은 세션별 전체 학생 리포트 생성을 위해 중간 요약들을 더 작게 압축하는 학습 분석 AI입니다.

아래는 긴 세션 채팅 기록에서 나온 중간 요약 중 {batch_index + 1}/{total_batches}번째 묶음입니다.
최종 세션 리포트 생성에 필요한 정보만 보존하여 더 압축된 JSON 요약 하나를 작성하세요.

중요:
- 반복 질문, 공통 취약 개념, 세션 후반까지 남은 약점을 우선 보존하세요.
- 같은 개념의 예문별 질문은 더 일반적인 질문 하나로 합치세요.
- 서로 포함 관계인 취약 개념은 더 넓은 개념 하나로 합치세요.
- 한 번 나온 곁가지 주제나 다음 단원 예고성 질문은 제외하세요.
- 해결된 혼란과 여전히 남은 취약점을 구분하세요.
- 특정 학생을 낙인찍는 표현을 피하세요.
- 출력은 JSON 객체 하나만 작성하세요.

{LANGUAGE_RULE}

출력 형식:
{{
  "batch_index": {batch_index + 1},
  "total_batches": {total_batches},
  "class_state_observations": ["string"],
  "key_questions": ["string"],
  "weak_concept_candidates": ["string"],
  "resolved_or_improved_points": ["string"]
}}

중간 요약 묶음:
{summaries_text}
"""


def _build_session_repair_json_prompt(raw_text: str) -> str:
    return f"""아래 텍스트를 유효한 세션 전체 리포트 JSON으로만 변환하세요.

반드시 다음 3개 필드만 포함하세요.
- class_summary: string
- key_questions: string[]
- weak_concepts_top5: string[]

규칙:
- 마크다운, 코드블록, 설명문, 주석은 출력하지 마세요.
- JSON 객체 하나만 출력하세요.
- 배열 필드가 없거나 판단하기 어려운 경우 ["없음"]으로 두세요.
- weak_concepts_top5는 최대 5개만 포함하세요.
- 모든 설명은 현대 한국어의 한글 문장으로 작성하세요.
- 한자, 일본어, 중국어 표기를 절대 사용하지 마세요.
- "주격", "목적격", "목적어", "관계대명사", "선행사", "생략" 같은 한국어 문법 용어는 이미 올바른 한글 표현이므로 그대로 유지하세요.
- "주격 관계대명사"를 "주체 관계대명사"로, "목적격 관계대명사"를 "목적 관계대명사"로 바꾸지 마세요.

변환할 텍스트:
{raw_text}
"""


def _build_session_remove_foreign_chars_prompt(report_json: str) -> str:
    return f"""아래 JSON의 구조와 의미는 유지하되, 값에 포함된 한자, 일본어, 중국어 표기를 모두 자연스러운 한국어 표현으로 바꾸세요.

규칙:
- JSON key는 그대로 유지하세요.
- 마크다운, 코드블록, 설명문 없이 JSON 객체만 출력하세요.
- JSON에는 class_summary, key_questions, weak_concepts_top5 3개 필드만 포함하세요.
- weak_concepts_top5는 최대 5개만 포함하세요.
- "주격", "목적격", "목적어", "관계대명사", "선행사", "생략" 같은 한국어 문법 용어는 이미 올바른 한글 표현이므로 그대로 유지하세요.
- "주격 관계대명사"를 "주체 관계대명사"로, "목적격 관계대명사"를 "목적 관계대명사"로 바꾸지 마세요.

입력 JSON:
{report_json}
"""


def _normalize_session_report_data(data: dict[str, Any]) -> dict[str, Any]:
    allowed_fields = {"class_summary", "key_questions", "weak_concepts_top5"}
    normalized = {key: data.get(key) for key in allowed_fields}

    class_summary = normalized.get("class_summary")
    if not isinstance(class_summary, str) or not class_summary.strip():
        normalized["class_summary"] = "반 전체 리포트를 생성할 근거가 부족합니다."

    for field in ("key_questions", "weak_concepts_top5"):
        value = normalized.get(field)
        if not isinstance(value, list):
            normalized[field] = ["없음"]
            continue

        strings = [str(item).strip() for item in value if str(item).strip()]
        normalized[field] = strings or ["없음"]

    normalized["weak_concepts_top5"] = normalized["weak_concepts_top5"][:5]
    return normalized


def _normalize_semantic_text(text: str) -> str:
    normalized = text.lower()
    normalized = re.sub(r"\[[^\]]+\]", " ", normalized)
    normalized = re.sub(r"[^\w가-힣]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def _semantic_tokens(text: str) -> set[str]:
    normalized = _normalize_semantic_text(text)
    return {
        token
        for token in normalized.split()
        if len(token) > 1 and token not in GENERIC_REPORT_WORDS
    }


def _has_any(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in text for keyword in keywords)


def _semantic_group(item: str) -> str:
    text = _normalize_semantic_text(item)

    has_case_signal = _has_any(
        text,
        (
            "주격",
            "목적격",
            "주어",
            "목적어",
            "빠진 성분",
            "문장 성분",
        ),
    )
    has_case_judgement = _has_any(
        text,
        (
            "구분",
            "기준",
            "판단",
            "확인",
            "보는",
            "역할",
        ),
    )

    if _has_any(text, ("전치사",)) and _has_any(text, ("생략",)):
        return "preposition_omission"

    if has_case_signal and has_case_judgement:
        return "subject_object_case"

    if _has_any(text, ("목적격",)) and _has_any(text, ("생략",)):
        return "object_case_omission"

    if _has_any(text, ("대명사",)) and _has_any(text, ("중복", "반복", "다시")):
        return "pronoun_repetition"

    if _has_any(text, ("who", "which")) and _has_any(text, ("선택", "기준", "선행사")):
        return "who_which_selection"

    if _has_any(text, ("선행사",)):
        return "antecedent"

    if _has_any(text, ("관계부사",)):
        return "relative_adverb"

    if _has_any(text, ("역할",)) and _has_any(text, ("생략",)):
        return "broad_role_omission"

    return "other"


def _token_overlap_ratio(first: set[str], second: set[str]) -> float:
    if not first or not second:
        return 0.0

    return len(first & second) / min(len(first), len(second))


def _is_semantically_duplicate(candidate: str, existing: str) -> bool:
    candidate_text = _normalize_semantic_text(candidate)
    existing_text = _normalize_semantic_text(existing)

    if not candidate_text or candidate_text == "없음":
        return False

    if candidate_text == existing_text:
        return True

    candidate_group = _semantic_group(candidate)
    existing_group = _semantic_group(existing)

    if candidate_group != "other" and candidate_group == existing_group:
        return True

    candidate_tokens = _semantic_tokens(candidate)
    existing_tokens = _semantic_tokens(existing)
    return _token_overlap_ratio(candidate_tokens, existing_tokens) >= 0.8


def _representative_score(item: str, field: str) -> tuple[int, int, int]:
    text = _normalize_semantic_text(item)
    score = 0

    if "관계대명사" in text:
        score += 2

    if "주격" in text and "목적격" in text:
        score += 4

    if "주어" in text and "목적어" in text:
        score += 2

    if "전치사" in text and "생략" in text:
        score += 3

    if "뒤 절" in text or "빠진 성분" in text:
        score += 1

    if field == "key_questions":
        if item.strip().endswith("?") or item.strip().endswith("요?"):
            score += 2
        if _has_any(text, ("어떻게", "무엇", "언제", "왜")):
            score += 1
        if len(item) > 70:
            score -= 1
    else:
        if _has_any(text, ("구분", "조건", "기준", "여부")):
            score += 2
        if len(item) > 34:
            score -= 1

    return (
        score,
        -abs(len(item) - (42 if field == "key_questions" else 24)),
        -len(item),
    )


def _pick_better_representative(current: str, candidate: str, field: str) -> str:
    if _representative_score(candidate, field) > _representative_score(current, field):
        return candidate

    return current


def _dedupe_and_rerank_items(
    items: list[str],
    field: str,
    max_items: int,
) -> list[str]:
    if items == ["없음"]:
        return items

    clusters: list[dict[str, Any]] = []

    for index, item in enumerate(items):
        normalized_item = item.strip()

        if not normalized_item or normalized_item == "없음":
            continue

        duplicate_cluster = None
        for cluster in clusters:
            if _is_semantically_duplicate(normalized_item, cluster["representative"]):
                duplicate_cluster = cluster
                break

        if duplicate_cluster is None:
            clusters.append(
                {
                    "index": index,
                    "group": _semantic_group(normalized_item),
                    "representative": normalized_item,
                }
            )
            continue

        duplicate_cluster["representative"] = _pick_better_representative(
            duplicate_cluster["representative"],
            normalized_item,
            field,
        )
        duplicate_cluster["group"] = _semantic_group(duplicate_cluster["representative"])

    if not clusters:
        return ["없음"]

    reranked_clusters = sorted(
        clusters,
        key=lambda cluster: (
            SEMANTIC_GROUP_PRIORITY.get(cluster["group"], SEMANTIC_GROUP_PRIORITY["other"]),
            cluster["index"],
        ),
    )

    return [cluster["representative"] for cluster in reranked_clusters[:max_items]]


def _postprocess_session_report(report: SessionAggregateReport) -> SessionAggregateReport:
    data = _normalize_session_report_data(_report_to_dict(report))
    data["key_questions"] = _dedupe_and_rerank_items(
        data["key_questions"],
        field="key_questions",
        max_items=SESSION_REPORT_MAX_KEY_QUESTIONS,
    )
    data["weak_concepts_top5"] = _dedupe_and_rerank_items(
        data["weak_concepts_top5"],
        field="weak_concepts_top5",
        max_items=5,
    )
    return SessionAggregateReport(**data)


def _parse_session_report_json(raw_text: str) -> SessionAggregateReport:
    data = _parse_report_json(raw_text)
    return _postprocess_session_report(SessionAggregateReport(**_normalize_session_report_data(data)))


def _report_to_dict(report: SessionAggregateReport) -> dict:
    return report.model_dump() if hasattr(report, "model_dump") else report.dict()


async def _repair_and_parse_session_report_json(
    client: AsyncOpenAI,
    raw_text: str,
    session_id: Optional[str] = None,
) -> SessionAggregateReport:
    repaired_text = await _call_session_llm(
        client=client,
        prompt=_build_session_repair_json_prompt(raw_text),
        max_tokens=1024,
        temperature=0.0,
        session_id=session_id,
        stage="json_repair",
    )
    return _parse_session_report_json(repaired_text)


def _session_report_contains_foreign_chars(report: SessionAggregateReport) -> bool:
    report_json = json.dumps(_report_to_dict(report), ensure_ascii=False)
    return _contains_foreign_chars(report_json)


KNOWN_FOREIGN_FRAGMENT_REPLACEMENTS = {
    "との": "와의",
    "の": "의",
    "と": "와",
    "を": "을",
    "に": "에",
    "は": "는",
    "が": "가",
    "関係代名詞": "관계대명사",
    "目的格": "목적격",
    "主格": "주격",
    "理解": "이해",
    "文法": "문법",
    "説明": "설명",
    "質問": "질문",
}


def _replace_known_foreign_fragments(text: str) -> str:
    cleaned = re.sub(r"([가-힣])と([가-힣])", r"\1와 \2", text)
    for source, target in KNOWN_FOREIGN_FRAGMENT_REPLACEMENTS.items():
        cleaned = cleaned.replace(source, target)
    return cleaned


def _clean_known_foreign_fragments_in_session_report(
    report: SessionAggregateReport,
) -> SessionAggregateReport:
    data = _report_to_dict(report)
    cleaned_data = {
        "class_summary": _replace_known_foreign_fragments(str(data.get("class_summary", ""))),
        "key_questions": [
            _replace_known_foreign_fragments(str(item))
            for item in data.get("key_questions", [])
        ],
        "weak_concepts_top5": [
            _replace_known_foreign_fragments(str(item))
            for item in data.get("weak_concepts_top5", [])
        ],
    }
    return _postprocess_session_report(
        SessionAggregateReport(**_normalize_session_report_data(cleaned_data))
    )


async def _ensure_no_foreign_chars_in_session_report(
    client: AsyncOpenAI,
    report: SessionAggregateReport,
    session_id: Optional[str] = None,
) -> SessionAggregateReport:
    if not _session_report_contains_foreign_chars(report):
        return report

    print(
        "[WARN] 세션 전체 리포트에 한자/일본어/중국어 포함 감지. 한글 변환 repair 재시도 "
        f"session_id={session_id}"
    )

    try:
        report_json = json.dumps(_report_to_dict(report), ensure_ascii=False)
        cleaned_text = await _call_session_llm(
            client=client,
            prompt=_build_session_remove_foreign_chars_prompt(report_json),
            max_tokens=1024,
            temperature=0.0,
            session_id=session_id,
            stage="foreign_char_repair",
        )
        cleaned_report = _parse_session_report_json(cleaned_text)

        if _session_report_contains_foreign_chars(cleaned_report):
            known_fragment_cleaned_report = _clean_known_foreign_fragments_in_session_report(
                cleaned_report
            )

            if not _session_report_contains_foreign_chars(known_fragment_cleaned_report):
                return known_fragment_cleaned_report

            print(
                "[ERROR] 한글 변환 repair 후에도 해당 문자 포함 감지. 원본 session report 반환 "
                f"session_id={session_id}"
            )
            return report

        return cleaned_report
    except Exception as repair_error:
        known_fragment_cleaned_report = _clean_known_foreign_fragments_in_session_report(report)

        if not _session_report_contains_foreign_chars(known_fragment_cleaned_report):
            return known_fragment_cleaned_report

        print(
            "[ERROR] 세션 전체 리포트 한글 변환 repair 실패. 원본 report 반환 "
            f"session_id={session_id}, error={repair_error}"
        )
        return report


def _empty_session_report() -> SessionAggregateReport:
    return SessionAggregateReport(
        class_summary="학생 발화 기록이 충분하지 않아 반 전체 상태를 판단하기 어렵습니다.",
        key_questions=["없음"],
        weak_concepts_top5=["없음"],
    )


def _llm_failed_session_report() -> SessionAggregateReport:
    return SessionAggregateReport(
        class_summary="LLM 호출 중 오류가 발생하여 반 전체 리포트를 생성하지 못했습니다.",
        key_questions=["없음"],
        weak_concepts_top5=["없음"],
    )


def _fallback_session_parse_error_report(raw_text: str) -> SessionAggregateReport:
    return SessionAggregateReport(
        class_summary=(
            raw_text[:300]
            if raw_text
            else "세션 전체 리포트 파싱 중 오류가 발생했습니다."
        ),
        key_questions=["없음"],
        weak_concepts_top5=["없음"],
    )


async def _compress_summaries_for_synthesis(
    client: AsyncOpenAI,
    summaries: list[str],
    session_id: Optional[str] = None,
) -> list[str]:
    current_summaries = summaries

    while len("\n\n".join(current_summaries)) > SESSION_REPORT_SYNTHESIS_MAX_CHARS:
        batches = _split_text_items(
            current_summaries,
            SESSION_REPORT_SUMMARY_BATCH_MAX_CHARS,
        )

        if len(batches) >= len(current_summaries):
            print(
                "[WARN] session report summary compression cannot reduce further "
                f"session_id={session_id}, summaries={len(current_summaries)}"
            )
            return current_summaries

        print(
            "[INFO] session report summary compression "
            f"session_id={session_id}, summaries={len(current_summaries)}, batches={len(batches)}"
        )

        compressed_summaries: list[str] = []
        for i, batch in enumerate(batches):
            summary = await _call_session_llm(
                client=client,
                prompt=_build_session_rollup_prompt(
                    summaries=batch,
                    batch_index=i,
                    total_batches=len(batches),
                ),
                max_tokens=1024,
                temperature=0.2,
                session_id=session_id,
                stage="rollup_compression",
            )
            compressed_summaries.append(summary.strip())
            print(
                "[INFO] session report summary compression done "
                f"{i + 1}/{len(batches)}"
            )

        current_summaries = compressed_summaries

    return current_summaries


async def generate_session_report(
    students: list[StudentSessionChat],
    session_id: Optional[str] = None,
) -> SessionAggregateReport:
    conversation_text, included_student_count = _format_session_conversations(students)

    if included_student_count == 0 or not conversation_text.strip():
        print(
            "[WARN] 세션 전체 리포트 생성 근거가 되는 학생 발화가 없습니다. "
            f"session_id={session_id}"
        )
        return _empty_session_report()

    estimated_tokens = _estimate_tokens(conversation_text)
    print(
        "[INFO] SessionAggregateReport generation start "
        f"session_id={session_id}, students={included_student_count}, "
        f"chars={len(conversation_text)}, estimated_tokens={estimated_tokens}"
    )

    client = _get_client()

    try:
        if estimated_tokens <= SESSION_REPORT_TOKEN_THRESHOLD:
            prompt = _build_session_report_prompt(
                conversation_text=conversation_text,
                included_student_count=included_student_count,
            )
            raw_text = await _call_session_llm(
                client=client,
                prompt=prompt,
                max_tokens=1536,
                temperature=0.2,
                session_id=session_id,
                stage="direct_report",
            )
        else:
            chunks = _split_session_blocks(conversation_text)
            chunk_summaries: list[str] = []
            print(f"[INFO] session report chunk count={len(chunks)}")

            for i, chunk in enumerate(chunks):
                summary = await _call_session_llm(
                    client=client,
                    prompt=_build_session_chunk_summary_prompt(
                        chunk_text=chunk,
                        chunk_index=i,
                        total_chunks=len(chunks),
                    ),
                    max_tokens=1024,
                    temperature=0.2,
                    session_id=session_id,
                    stage=f"chunk_summary_{i + 1}",
                )
                chunk_summaries.append(summary.strip())
                print(f"[INFO] session report chunk summary done {i + 1}/{len(chunks)}")

            chunk_summaries = await _compress_summaries_for_synthesis(
                client=client,
                summaries=chunk_summaries,
                session_id=session_id,
            )

            raw_text = await _call_session_llm(
                client=client,
                prompt=_build_session_synthesis_prompt(chunk_summaries),
                max_tokens=1536,
                temperature=0.2,
                session_id=session_id,
                stage="final_synthesis",
            )
    except Exception as e:
        print(f"[ERROR] 세션 전체 리포트 LLM 호출 실패 session_id={session_id}, error={e}")
        return _llm_failed_session_report()

    try:
        report = _parse_session_report_json(raw_text)
        return await _ensure_no_foreign_chars_in_session_report(
            client=client,
            report=report,
            session_id=session_id,
        )
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(
            "[WARN] 세션 전체 리포트 JSON 1차 파싱 실패. repair 재시도 "
            f"session_id={session_id}, error={e}, raw_preview={raw_text[:300]}"
        )

        try:
            report = await _repair_and_parse_session_report_json(
                client,
                raw_text,
                session_id=session_id,
            )
            return await _ensure_no_foreign_chars_in_session_report(
                client=client,
                report=report,
                session_id=session_id,
            )
        except Exception as repair_error:
            print(
                "[ERROR] 세션 전체 리포트 JSON repair 실패 "
                f"session_id={session_id}, error={repair_error}, raw_preview={raw_text[:300]}"
            )
            return _fallback_session_parse_error_report(raw_text)
