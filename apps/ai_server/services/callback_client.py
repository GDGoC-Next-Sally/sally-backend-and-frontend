"""
services/callback_client.py — NestJS 백엔드 콜백 호출 클라이언트

AI 서버가 학생 채팅 분석을 완료한 뒤,
NestJS 백엔드의 POST /livechat/analytics-callback 엔드포인트를 호출합니다.

호출 흐름:
  AI 서버 (/analyze)
      → analyze_student() 로 TeacherSummary 생성
      → notify_backend_analytics_callback() 으로 NestJS에 결과 전송
      → NestJS가 DB 저장 + 선생님 소켓 실시간 알림 처리
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


async def notify_backend_analytics_callback(
    dialog_id: int,
    analysis: dict,
) -> bool:
    """
    NestJS 백엔드의 analytics-callback API를 비동기로 호출합니다.

    Args:
        dialog_id: 분석 대상 대화(dialog)의 ID
        analysis:  TeacherSummary를 dict로 변환한 분석 결과 데이터

    Returns:
        bool: 콜백 전송 성공 여부 (실패해도 AI 서버 로직 자체는 중단되지 않음)
    """
    url = f"{BACKEND_URL}/livechat/analytics-callback"
    payload = {
        "dialog_id": dialog_id,
        "analysis": analysis,
    }
    
    # 보안 강화를 위한 내부 통신용 시크릿 키
    internal_secret = os.getenv("INTERNAL_SECRET_KEY", "default-secret-key-change-it")
    headers = {
        "x-internal-secret": internal_secret
    }

    try:
        # timeout=10s: 네트워크 지연 등 대비 (백엔드가 응답이 느려도 AI 서버가 블록되지 않도록)
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            print(f"[INFO] 백엔드 콜백 전송 성공 (dialog_id={dialog_id}, status={response.status_code})")
            return True
    except httpx.HTTPStatusError as e:
        print(f"[WARN] 백엔드 콜백 HTTP 오류 (dialog_id={dialog_id}): {e.response.status_code} {e.response.text}")
        return False
    except Exception as e:
        print(f"[WARN] 백엔드 콜백 전송 실패 (dialog_id={dialog_id}): {e}")
        return False
