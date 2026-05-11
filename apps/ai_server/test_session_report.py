"""
test_session_report.py - 세션별 전체 학생 리포트 생성 파이프라인 테스트

실행 방법:
    cd apps/ai_server
    python test_session_report.py
"""

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_server.models import SessionAggregateReport, StudentSessionChat
from ai_server.services import session_report_builder
from ai_server.services.session_report_builder import (
    generate_session_report,
    _clean_known_foreign_fragments_in_session_report,
    _parse_session_report_json,
    _postprocess_session_report,
    _session_report_contains_foreign_chars,
    _split_session_blocks,
)


SESSION_STUDENTS = [
    StudentSessionChat(
        student_id="student-001",
        student_name="김고대",
        chat_messages=[
            {
                "role": "assistant",
                "content": "관계대명사의 주격과 목적격을 구분해볼게요.",
            },
            {
                "role": "student",
                "content": "주격 관계대명사랑 목적격 관계대명사는 어떻게 구분하나요?",
            },
            {
                "role": "student",
                "content": "who면 무조건 주격이고 which면 목적격인가요?",
            },
        ],
    ),
    StudentSessionChat(
        student_id="student-002",
        student_name="박연습",
        chat_messages=[
            {
                "sender_type": "AI",
                "content": "This is the book. I bought it yesterday. 두 문장을 연결해볼까요?",
            },
            {
                "sender_type": "STUDENT",
                "content": "This is the book which I bought it yesterday라고 쓰면 되나요?",
            },
            {
                "sender_type": "STUDENT",
                "content": "목적격 관계대명사 뒤에 it을 다시 쓰면 안 되는 이유가 헷갈려요.",
            },
        ],
    ),
]


EMPTY_STUDENTS = [
    StudentSessionChat(
        student_id="student-empty",
        chat_messages=[
            {
                "role": "assistant",
                "content": "오늘은 수동태를 공부해볼게요.",
            }
        ],
    )
]


class MockLLM:
    def __init__(self, responses: list[str]):
        self.responses = responses
        self.calls: list[dict] = []

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)

        if not self.responses:
            raise RuntimeError("Mock LLM response exhausted")

        return self.responses.pop(0)


def to_dict(report) -> dict:
    return report.model_dump() if hasattr(report, "model_dump") else report.dict()


def validate_session_report(report_dict: dict) -> list[str]:
    errors = []
    expected = {"class_summary", "key_questions", "weak_concepts_top5"}
    actual = set(report_dict.keys())

    if actual != expected:
        errors.append(f"필드 불일치: expected={sorted(expected)}, actual={sorted(actual)}")

    if not isinstance(report_dict.get("class_summary"), str):
        errors.append("class_summary는 string이어야 합니다.")

    if not isinstance(report_dict.get("key_questions"), list):
        errors.append("key_questions는 list[str]이어야 합니다.")

    if not isinstance(report_dict.get("weak_concepts_top5"), list):
        errors.append("weak_concepts_top5는 list[str]이어야 합니다.")

    if len(report_dict.get("weak_concepts_top5", [])) > 5:
        errors.append("weak_concepts_top5는 최대 5개여야 합니다.")

    return errors


async def with_mock_llm(mock_llm: MockLLM, func):
    original_get_client = session_report_builder._get_client
    original_call_llm = session_report_builder._call_llm

    session_report_builder._get_client = lambda: object()
    session_report_builder._call_llm = mock_llm

    try:
        return await func()
    finally:
        session_report_builder._get_client = original_get_client
        session_report_builder._call_llm = original_call_llm


async def run_empty_case() -> bool:
    report = await generate_session_report(EMPTY_STUDENTS, session_id="empty-session")
    report_dict = to_dict(report)
    errors = validate_session_report(report_dict)

    print("\n[1] 학생 발화 없음 fallback")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    if errors:
        print("\n".join(errors))
        return False

    return report_dict["key_questions"] == ["없음"] and report_dict["weak_concepts_top5"] == ["없음"]


async def run_normal_case() -> bool:
    response = json.dumps(
        {
            "class_summary": "반 전체적으로 관계대명사의 역할은 따라가고 있으나 주격과 목적격 구분, 목적격 뒤 대명사 반복에서 혼란이 반복되었습니다.",
            "key_questions": [
                "주격 관계대명사와 목적격 관계대명사는 어떻게 구분하나요?",
                "목적격 관계대명사 뒤에 대명사를 다시 쓰면 왜 안 되나요?",
            ],
            "weak_concepts_top5": [
                "주격 관계대명사와 목적격 관계대명사 구분",
                "목적격 관계대명사 뒤 대명사 반복",
                "관계대명사의 대명사 역할",
                "선행사 기준 관계대명사 선택",
                "관계대명사 생략 조건",
                "초과 항목",
            ],
        },
        ensure_ascii=False,
    )
    mock_llm = MockLLM([response])

    async def _run():
        return await generate_session_report(SESSION_STUDENTS, session_id="normal-session")

    report = await with_mock_llm(mock_llm, _run)
    report_dict = to_dict(report)
    errors = validate_session_report(report_dict)

    print("\n[2] 정상 생성 및 TOP 5 제한")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    if errors:
        print("\n".join(errors))
        return False

    return (
        len(report_dict["weak_concepts_top5"]) <= 5
        and "초과 항목" not in report_dict["weak_concepts_top5"]
        and len(mock_llm.calls) == 1
    )


async def run_repair_case() -> bool:
    repaired_response = json.dumps(
        {
            "class_summary": "반 전체적으로 목적격 관계대명사 적용에서 반복 혼란이 확인되었습니다.",
            "key_questions": ["목적격 관계대명사 뒤에 대명사를 다시 쓰면 왜 안 되나요?"],
            "weak_concepts_top5": ["목적격 관계대명사 뒤 대명사 반복"],
        },
        ensure_ascii=False,
    )
    mock_llm = MockLLM(["not-json", repaired_response])

    async def _run():
        return await generate_session_report(SESSION_STUDENTS, session_id="repair-session")

    report = await with_mock_llm(mock_llm, _run)
    report_dict = to_dict(report)
    errors = validate_session_report(report_dict)

    print("\n[3] JSON repair")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    if errors:
        print("\n".join(errors))
        return False

    return len(mock_llm.calls) == 2


async def run_long_path_case() -> bool:
    original_threshold = session_report_builder.SESSION_REPORT_TOKEN_THRESHOLD
    session_report_builder.SESSION_REPORT_TOKEN_THRESHOLD = 1

    final_response = json.dumps(
        {
            "class_summary": "긴 세션에서도 공통 질문과 취약 개념을 종합했습니다.",
            "key_questions": ["관계대명사는 뒤 절에서 어떤 역할을 하나요?"],
            "weak_concepts_top5": ["관계대명사의 문장 성분 역할"],
        },
        ensure_ascii=False,
    )
    mock_llm = MockLLM(["chunk summary", final_response])

    async def _run():
        return await generate_session_report(SESSION_STUDENTS, session_id="long-session")

    try:
        report = await with_mock_llm(mock_llm, _run)
    finally:
        session_report_builder.SESSION_REPORT_TOKEN_THRESHOLD = original_threshold

    report_dict = to_dict(report)
    errors = validate_session_report(report_dict)

    print("\n[4] 긴 세션 chunk summary + synthesis 경로")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    if errors:
        print("\n".join(errors))
        return False

    return len(mock_llm.calls) == 2


def run_parse_normalization_case() -> bool:
    report = _parse_session_report_json(
        json.dumps(
            {
                "class_summary": "정규화 테스트입니다.",
                "key_questions": "질문 아님",
                "weak_concepts_top5": ["a", "b", "c", "d", "e", "f"],
                "extra_field": "ignored",
            },
            ensure_ascii=False,
        )
    )
    report_dict = to_dict(report)
    errors = validate_session_report(report_dict)

    print("\n[5] 파싱 정규화")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    if errors:
        print("\n".join(errors))
        return False

    return report_dict["key_questions"] == ["없음"] and len(report_dict["weak_concepts_top5"]) == 5


def run_oversized_student_block_split_case() -> bool:
    oversized_block = "\n".join(
        [
            "[student_context] 매우 긴 학생",
            "[assistant] 긴 대화를 시작합니다.",
            f"[student] {'관계대명사 주격 목적격 구분이 헷갈립니다. ' * 80}",
            f"[assistant] {'뒤 절의 주어와 목적어를 확인해봅시다. ' * 80}",
            f"[student] {'전치사가 있으면 목적격 생략 조건도 헷갈립니다. ' * 80}",
        ]
    )
    chunks = _split_session_blocks(oversized_block, chunk_max_chars=500)

    print("\n[6] 한 학생 대화 블록 과대 입력 분할")
    print(json.dumps(
        {
            "chunk_count": len(chunks),
            "max_chunk_len": max(len(chunk) for chunk in chunks),
        },
        ensure_ascii=False,
        indent=2,
    ))

    return len(chunks) > 1 and all(len(chunk) <= 500 for chunk in chunks)


def run_known_foreign_fragment_cleanup_case() -> bool:
    report = SessionAggregateReport(
        class_summary="반 전체적으로 관계대명사를 이해하고 있습니다.",
        key_questions=["관계대명사と대명사는 어떻게 다른가요?"],
        weak_concepts_top5=["관계대명사との 차이"],
    )
    cleaned_report = _clean_known_foreign_fragments_in_session_report(report)
    report_dict = to_dict(cleaned_report)

    print("\n[7] 알려진 일본어 조각 정리")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    return (
        not _session_report_contains_foreign_chars(cleaned_report)
        and "관계대명사와의 차이" in report_dict["weak_concepts_top5"]
    )


def run_semantic_dedupe_rerank_case() -> bool:
    report = SessionAggregateReport(
        class_summary="반 전체적으로 관계대명사 구분과 생략 조건에서 혼란이 있습니다.",
        key_questions=[
            "관계대명사가 뒤 절에서 주어인지 목적어인지 보는 기준은 무엇인가요?",
            "목적격 관계대명사를 언제 생략할 수 있나요?",
            "주격과 목적격의 구분은 어떻게 하나요?",
            "전치사가 관계대명사 앞에 있을 때와 뒤에 있을 때의 차이는 무엇인가요?",
            "관계대명사는 뒤 절에서 주어인지 목적어인지 어떻게 구분할 수 있나요?",
        ],
        weak_concepts_top5=[
            "뒤 절에서 빠진 성분이 주어인지 목적어인지 확인하는 기준",
            "전치사 위치에 따른 생략 여부",
            "관계대명사의 주격과 목적격 구분",
            "관계대명사의 생략과 전치사 위치의 상호작용",
            "관계대명사의 역할과 생략 조건",
        ],
    )
    postprocessed_report = _postprocess_session_report(report)
    report_dict = to_dict(postprocessed_report)

    print("\n[8] 의미 중복 제거 및 재랭킹")
    print(json.dumps(report_dict, ensure_ascii=False, indent=2))

    return (
        len(report_dict["key_questions"]) == 3
        and len(report_dict["weak_concepts_top5"]) == 3
        and "관계대명사의 주격과 목적격 구분" in report_dict["weak_concepts_top5"]
        and "관계대명사의 생략과 전치사 위치의 상호작용" in report_dict["weak_concepts_top5"]
    )


async def main():
    results = [
        await run_empty_case(),
        await run_normal_case(),
        await run_repair_case(),
        await run_long_path_case(),
        run_parse_normalization_case(),
        run_oversized_student_block_split_case(),
        run_known_foreign_fragment_cleanup_case(),
        run_semantic_dedupe_rerank_case(),
    ]

    print("\n테스트 요약")
    for index, success in enumerate(results, start=1):
        print(f"{index}. {'PASS' if success else 'FAIL'}")

    if not all(results):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
