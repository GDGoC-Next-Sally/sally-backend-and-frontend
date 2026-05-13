"""
test_db_save.py - student_reports / session_reports DB 저장 검증 테스트

실행 방법:
    cd apps
    PYTHONPATH=. python ai_server/test_db_save.py
"""

import asyncio
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_server.services.db_client import (
    save_student_report,
    save_session_report,
    _get_db,
)

# ── 테스트용 더미 데이터 ────────────────────────────────────────────
TEST_STUDENT_ID   = "00000000-0000-0000-0000-000000000001"   # 실제 DB에 없어도 됨
TEST_DIALOG_ID    = 99999     # 실제 DB에 없어도 됨 (FK 없으면 삽입 성공)
TEST_SESSION_ID   = 99999

STUDENT_REPORT_CONTENT = {
    "understanding_trend": "점진적 이해",
    "key_mistakes": ["주격/목적격 혼동"],
    "recommendation": "관계대명사 패턴 추가 학습 권장",
    "_test": True,
}

SESSION_REPORT_CONTENT = {
    "class_summary": "전반적으로 양호한 수업이었습니다.",
    "key_questions": ["관계대명사 주격과 목적격 구분 방법은?"],
    "weak_concepts_top5": ["주격 관계대명사", "목적격 관계대명사"],
    "_test": True,
}


def query_student_report(session_id: int, student_id: str):
    """student_reports 테이블에서 저장 확인"""
    db = _get_db()
    res = (
        db.table("student_reports")
        .select("id, session_id, student_id, content, created_at")
        .eq("session_id", session_id)
        .eq("student_id", student_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def query_session_report(session_id: int):
    """session_reports 테이블에서 저장 확인"""
    db = _get_db()
    res = (
        db.table("session_reports")
        .select("id, session_id, content, created_at")
        .eq("session_id", session_id)
        .execute()
    )
    return res.data[0] if res.data else None


def delete_test_data():
    """테스트 후 생성된 더미 데이터 삭제"""
    db = _get_db()
    try:
        db.table("student_reports").delete().eq("session_id", TEST_SESSION_ID).eq("student_id", TEST_STUDENT_ID).execute()
        print("  [cleanup] student_reports 테스트 데이터 삭제 완료")
    except Exception as e:
        print(f"  [cleanup] student_reports 삭제 실패: {e}")
    try:
        db.table("session_reports").delete().eq("session_id", TEST_SESSION_ID).execute()
        print("  [cleanup] session_reports 테스트 데이터 삭제 완료")
    except Exception as e:
        print(f"  [cleanup] session_reports 삭제 실패: {e}")


async def test_save_student_report() -> bool:
    print("\n[1] save_student_report() → student_reports 테이블 저장 테스트")
    try:
        await save_student_report(
            student_id=TEST_STUDENT_ID,
            session_id=TEST_SESSION_ID,
            dialog_id=TEST_DIALOG_ID,
            content=STUDENT_REPORT_CONTENT,
        )
        print("  → save_student_report() 호출 성공")
    except Exception as e:
        print(f"  ❌ save_student_report() 호출 실패: {e}")
        return False

    row = query_student_report(TEST_SESSION_ID, TEST_STUDENT_ID)
    if row is None:
        print("  ❌ DB에서 저장된 레코드를 찾을 수 없음")
        return False

    print(f"  ✅ DB 저장 확인! row id={row['id']}, session_id={row['session_id']}")
    print(f"     content._test={row['content'].get('_test')}")
    return row["content"].get("_test") is True


async def test_save_session_report() -> bool:
    print("\n[2] save_session_report() → session_reports 테이블 저장 테스트")
    try:
        await save_session_report(
            session_id=TEST_SESSION_ID,
            content=SESSION_REPORT_CONTENT,
        )
        print("  → save_session_report() 호출 성공")
    except Exception as e:
        print(f"  ❌ save_session_report() 호출 실패: {e}")
        return False

    row = query_session_report(TEST_SESSION_ID)
    if row is None:
        print("  ❌ DB에서 저장된 레코드를 찾을 수 없음")
        return False

    print(f"  ✅ DB 저장 확인! row id={row['id']}, session_id={row['session_id']}")
    print(f"     content._test={row['content'].get('_test')}")
    return row["content"].get("_test") is True


async def test_upsert_session_report() -> bool:
    """같은 session_id로 두 번 저장 시 upsert 동작 확인"""
    print("\n[3] session_reports upsert (같은 session_id로 재저장 시 덮어쓰기) 테스트")
    updated_content = {**SESSION_REPORT_CONTENT, "class_summary": "수정된 요약입니다."}
    try:
        await save_session_report(session_id=TEST_SESSION_ID, content=updated_content)
        print("  → 두 번째 save_session_report() 호출 성공")
    except Exception as e:
        print(f"  ❌ 두 번째 저장 실패: {e}")
        return False

    row = query_session_report(TEST_SESSION_ID)
    if row is None:
        print("  ❌ DB에서 저장된 레코드를 찾을 수 없음")
        return False

    result = row["content"].get("class_summary") == "수정된 요약입니다."
    if result:
        print("  ✅ upsert 정상 동작 - 내용이 갱신되었습니다.")
    else:
        print(f"  ❌ 내용이 갱신되지 않음: {row['content'].get('class_summary')}")
    return result


async def main():
    results = []
    try:
        results.append(await test_save_student_report())
        results.append(await test_save_session_report())
        results.append(await test_upsert_session_report())
    finally:
        print("\n  테스트 데이터 정리 중...")
        delete_test_data()

    print("\n─────────────────────────────────")
    labels = [
        "save_student_report() DB 저장",
        "save_session_report() DB 저장",
        "session_reports upsert 동작",
    ]
    all_pass = True
    for i, (label, ok) in enumerate(zip(labels, results), start=1):
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {i}. {status}  {label}")
        if not ok:
            all_pass = False

    print("─────────────────────────────────")
    if all_pass:
        print("  🎉 모든 테스트 통과!")
    else:
        print("  ⚠️  일부 테스트 실패. 위 내용 확인 필요.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
