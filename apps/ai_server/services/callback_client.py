"""
services/callback_client.py — NestJS 백엔드 콜백 호출 클라이언트
"""
import os
import httpx
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# NestJS 백엔드 서버 주소
# 로컬 개발 시: http://localhost:3001
# 배포 시: 환경변수 BACKEND_URL에 배포된 서버 주소를 설정하세요.
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")


def _internal_headers() -> dict[str, str]:
    internal_secret = os.getenv("INTERNAL_SECRET_KEY", "default-secret-key-change-it")
    return {"x-internal-secret": internal_secret}


async def _post_internal_callback(
    path: str,
    payload: dict,
    *,
    log_label: str,
) -> bool:
    url = f"{BACKEND_URL}{path}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=_internal_headers())
            response.raise_for_status()
            print(f"[INFO] 백엔드 {log_label} 콜백 전송 성공 (status={response.status_code})")
            return True
    except httpx.HTTPStatusError as e:
        print(f"[WARN] 백엔드 {log_label} 콜백 HTTP 오류: {e.response.status_code} {e.response.text}")
        return False
    except Exception as e:
        print(f"[WARN] 백엔드 {log_label} 콜백 전송 실패: {e}")
        return False


async def notify_backend_analytics_callback(
    dialog_id: int,
    analysis: dict,
) -> bool:
    """
    NestJS 백엔드의 analytics-callback API를 비동기로 호출합니다.

    Args:
        dialog_id: 분석 대상 대화(dialog)의 ID
        analysis:  RealtimeAnalysis를 dict로 변환한 분석 결과 데이터

    Returns:
        bool: 콜백 전송 성공 여부 (실패해도 AI 서버 로직 자체는 중단되지 않음)
    """
    payload = {
        "dialog_id": dialog_id,
        "analysis": analysis,
    }
    return await _post_internal_callback(
        "/livechat/analytics-callback",
        payload,
        log_label=f"실시간 분석(dialog_id={dialog_id})",
    )


async def notify_backend_session_report_callback(
    session_id: int,
    report: dict,
) -> bool:
    payload = {
        "session_id": session_id,
        "report": report,
    }
    return await _post_internal_callback(
        "/reports/session-report-callback",
        payload,
        log_label=f"세션 리포트(session_id={session_id})",
    )


async def notify_backend_student_report_callback(
    session_id: int,
    student_id: str,
    report: dict,
) -> bool:
    payload = {
        "session_id": session_id,
        "student_id": student_id,
        "report": report,
    }
    return await _post_internal_callback(
        "/reports/student-report-callback",
        payload,
        log_label=f"학생 리포트(session_id={session_id}, student_id={student_id})",
    )
