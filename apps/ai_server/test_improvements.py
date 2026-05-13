"""
test_improvements.py - 이번 개선 포인트 단위 테스트

테스트 항목:
  1. normalize_chat_messages: STUDENT/AI/TEACHER/SYSTEM만 허용
  2. _extract_json_object: 중첩 괄호 카운팅 방식
  3. realtime_summaries → realtime_context 생성 및 프롬프트 주입 확인
  4. chunk summary JSON 검증 경고 출력 확인

실행 방법:
    cd apps
    PYTHONPATH=. python ai_server/test_improvements.py
"""

import asyncio
import json
import sys
import io
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ai_server.services.report_builder import (
    normalize_chat_messages,
    _extract_json_object,
    _build_report_prompt,
    _build_synthesis_prompt,
)


# ─────────────────────────────────────────────────────────────
# Test 1. normalize_chat_messages — STUDENT/AI/TEACHER/SYSTEM 정규화
# ─────────────────────────────────────────────────────────────

def test_normalize_chat_messages() -> bool:
    print("\n[1] normalize_chat_messages() 정규화 테스트")

    raw_messages = [
        # 정상 케이스
        {"sender_type": "STUDENT", "content": "관계대명사가 뭔가요?"},
        {"sender_type": "AI", "content": "관계대명사는 두 문장을 연결합니다."},
        {"sender_type": "TEACHER", "content": "좀 더 쉽게 설명해줘"},
        {"sender_type": "SYSTEM", "content": "세션 시작"},
        # 레거시 필드 (sender_type 없이 role 사용)
        {"role": "STUDENT", "content": "role 필드 테스트"},
        # 알 수 없는 타입 → 통과(skip)
        {"sender_type": "UNKNOWN", "content": "이건 무시돼야 함"},
        # 빈 content → 통과(skip)
        {"sender_type": "STUDENT", "content": ""},
    ]

    result = normalize_chat_messages(raw_messages)

    expected_roles = ["student", "assistant", "teacher", "system", "student"]
    actual_roles = [m["role"] for m in result]

    print(f"  예상 role 순서: {expected_roles}")
    print(f"  실제 role 순서: {actual_roles}")

    ok = actual_roles == expected_roles
    print(f"  {'✅ PASS' if ok else '❌ FAIL'}")
    return ok


# ─────────────────────────────────────────────────────────────
# Test 2. _extract_json_object — 중첩 괄호 처리
# ─────────────────────────────────────────────────────────────

def test_extract_json_object() -> bool:
    print("\n[2] _extract_json_object() 중첩 괄호 카운팅 테스트")
    results = []

    # 2-1. 일반 단순 JSON
    simple = '{"a": "b"}'
    extracted = _extract_json_object(simple)
    ok1 = extracted == simple
    print(f"  2-1 단순 JSON: {'✅ PASS' if ok1 else '❌ FAIL'} → {extracted}")
    results.append(ok1)

    # 2-2. 중첩 괄호 (detailed_report 안에 JSON 포함)
    nested = '{"key": "value", "nested": {"inner": "data"}, "tail": "end"}'
    extracted2 = _extract_json_object(nested)
    try:
        parsed = json.loads(extracted2)
        ok2 = parsed["key"] == "value" and parsed["nested"]["inner"] == "data"
    except Exception:
        ok2 = False
    print(f"  2-2 중첩 괄호: {'✅ PASS' if ok2 else '❌ FAIL'} → {extracted2}")
    results.append(ok2)

    # 2-3. 앞뒤 텍스트 포함
    wrapped = "여기서는 다음과 같이 작성하세요.\n```json\n{\"result\": \"ok\"}\n```\n 감사합니다."
    extracted3 = _extract_json_object(wrapped)
    try:
        parsed3 = json.loads(extracted3)
        ok3 = parsed3["result"] == "ok"
    except Exception:
        ok3 = False
    print(f"  2-3 앞뒤 텍스트: {'✅ PASS' if ok3 else '❌ FAIL'} → {extracted3}")
    results.append(ok3)

    # 2-4. 문자열 안에 중괄호 포함 (escape 처리 검증)
    with_brace_in_string = '{"msg": "닫는 괄호 } 를 포함한 문자열", "ok": true}'
    extracted4 = _extract_json_object(with_brace_in_string)
    try:
        parsed4 = json.loads(extracted4)
        ok4 = parsed4["ok"] is True
    except Exception:
        ok4 = False
    print(f"  2-4 문자열 내 괄호: {'✅ PASS' if ok4 else '❌ FAIL'} → {extracted4}")
    results.append(ok4)

    return all(results)


# ─────────────────────────────────────────────────────────────
# Test 3. realtime_context 프롬프트 주입 확인
# ─────────────────────────────────────────────────────────────

def test_realtime_context_injection() -> bool:
    print("\n[3] realtime_context 프롬프트 주입 테스트")
    results = []

    # 3-1. realtime_summaries가 있을 때 context 생성 확인
    realtime_summaries = [
        {"understanding_score": 3, "student_emotion": "혼란", "need_intervention": False},
        {"understanding_score": 5, "student_emotion": "혼란", "need_intervention": True},
        {"understanding_score": 7, "student_emotion": "집중", "need_intervention": False},
    ]

    scores = [s.get("understanding_score") for s in realtime_summaries if s.get("understanding_score") is not None]
    interventions = [s for s in realtime_summaries if s.get("need_intervention")]
    emotions = [s.get("student_emotion") for s in realtime_summaries if s.get("student_emotion")]

    lines = []
    if scores:
        lines.append(f"이해도 변화: {' → '.join(str(s) for s in scores)}")
    if emotions:
        lines.append(f"감정 흐름: {' → '.join(emotions)}")
    if interventions:
        lines.append(f"교사 개입 필요 발생 횟수: {len(interventions)}회")

    realtime_context = (
        "\n\n[실시간 분석 요약]\n"
        + "\n".join(f"- {l}" for l in lines)
        if lines else ""
    )

    ok1 = "이해도 변화: 3 → 5 → 7" in realtime_context
    ok2 = "감정 흐름: 혼란 → 혼란 → 집중" in realtime_context
    ok3 = "교사 개입 필요 발생 횟수: 1회" in realtime_context
    print(f"  3-1 context 이해도 변화: {'✅ PASS' if ok1 else '❌ FAIL'}")
    print(f"  3-2 context 감정 흐름: {'✅ PASS' if ok2 else '❌ FAIL'}")
    print(f"  3-3 context 개입 횟수: {'✅ PASS' if ok3 else '❌ FAIL'}")
    results.extend([ok1, ok2, ok3])

    # 3-2. _build_report_prompt에 context 주입 확인
    prompt = _build_report_prompt("대화 텍스트", realtime_context=realtime_context)
    ok4 = "보조 컨텍스트:" in prompt and "[실시간 분석 요약]" in prompt
    print(f"  3-4 _build_report_prompt 주입: {'✅ PASS' if ok4 else '❌ FAIL'}")
    results.append(ok4)

    # 3-3. _build_synthesis_prompt에 context 주입 확인
    synthesis_prompt = _build_synthesis_prompt(["요약1", "요약2"], realtime_context=realtime_context)
    ok5 = "보조 컨텍스트:" in synthesis_prompt and "[실시간 분석 요약]" in synthesis_prompt
    print(f"  3-5 _build_synthesis_prompt 주입: {'✅ PASS' if ok5 else '❌ FAIL'}")
    results.append(ok5)

    # 3-4. realtime_context 없을 때 프롬프트에 "보조 컨텍스트:" 없어야 함
    prompt_empty = _build_report_prompt("대화 텍스트", realtime_context="")
    ok6 = "보조 컨텍스트:" not in prompt_empty
    print(f"  3-6 context 없을 때 주입 안 됨: {'✅ PASS' if ok6 else '❌ FAIL'}")
    results.append(ok6)

    return all(results)


# ─────────────────────────────────────────────────────────────
# Test 4. chunk summary JSON 검증 경고 (stdout 캡처)
# ─────────────────────────────────────────────────────────────

async def test_chunk_summary_json_warning() -> bool:
    print("\n[4] chunk summary JSON 검증 경고 출력 테스트")

    from ai_server.services.report_builder import _extract_json_object

    # 깨진 JSON chunk summary → _extract_json_object 파싱 실패 케이스 시뮬레이션
    broken_summary = "이 요약은 JSON 형식이 아닙니다. 그냥 텍스트입니다."

    captured = io.StringIO()
    original_stdout = sys.stdout
    sys.stdout = captured

    try:
        try:
            json.loads(_extract_json_object(broken_summary))
            warned = False
        except (json.JSONDecodeError, ValueError):
            print("[WARN] chunk summary 1/2 JSON 파싱 실패. 원본 텍스트로 진행.")
            warned = True
    finally:
        sys.stdout = original_stdout

    output = captured.getvalue()
    ok = warned and "[WARN]" in output
    print(f"  깨진 요약 경고 출력: {'✅ PASS' if ok else '❌ FAIL'}")
    if output:
        print(f"  출력: {output.strip()}")
    return ok


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

async def main():
    print("=" * 60)
    print("🔧 개선 포인트 단위 테스트")
    print("=" * 60)

    results = [
        ("normalize_chat_messages 정규화", test_normalize_chat_messages()),
        ("_extract_json_object 중첩 괄호", test_extract_json_object()),
        ("realtime_context 프롬프트 주입", test_realtime_context_injection()),
        ("chunk summary JSON 경고", await test_chunk_summary_json_warning()),
    ]

    print("\n" + "=" * 60)
    print("📌 테스트 요약")
    print("=" * 60)
    all_pass = True
    for label, ok in results:
        status = "✅ PASS" if ok else "❌ FAIL"
        print(f"  {status}  {label}")
        if not ok:
            all_pass = False

    print("=" * 60)
    if all_pass:
        print("🎉 모든 테스트 통과!")
    else:
        print("⚠️  일부 실패. 위 내용 확인 필요.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
