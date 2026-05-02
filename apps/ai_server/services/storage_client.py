"""
services/storage_client.py — Supabase Storage 연결 및 리포트 파일 업로드

수정 사항:
  - asyncio.to_thread()로 동기 supabase 호출을 스레드풀에서 실행 (이벤트루프 블로킹 방지)
"""
import os
import asyncio
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

from ai_server.models import FinalReport

# ai_server/.env 파일을 정확히 찾도록 경로 명시
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

_supabase_client: Optional[Client] = None



def _get_storage_client() -> Client:
    """Supabase 동기 클라이언트 싱글톤 반환 (내부 전용)"""
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. "
                ".env 파일을 확인해주세요."
            )
        _supabase_client = create_client(url, key)
    return _supabase_client


async def upload_report(report: FinalReport) -> str:
    """
    FinalReport를 JSON 파일로 변환하여 Supabase Storage에 업로드합니다.

    파일명 형식: report_{session_id}_{student_id}.json
    저장 위치: SUPABASE_REPORT_BUCKET 환경변수에 지정된 버킷

    Args:
        report: 업로드할 FinalReport 객체

    Returns:
        str: 업로드된 파일의 Supabase Storage 공개 URL

    Raises:
        RuntimeError: 업로드 실패 시
    """
    bucket_name = os.getenv("SUPABASE_REPORT_BUCKET", "reports")

    # 파일명 생성 (session_id + student_id 조합으로 고유성 보장)
    student_part = report.student_id.replace("-", "") if report.student_id else "unknown"
    file_name = f"report_{report.session_id}_{student_part}.json"

    # FinalReport를 JSON 바이트로 직렬화
    report_json_bytes = report.model_dump_json(indent=2).encode("utf-8")

    def _upload():
        client = _get_storage_client()

        # Supabase Storage에 업로드 (같은 파일명이 있으면 덮어쓰기)
        upload_response = (
            client.storage
            .from_(bucket_name)
            .upload(
                path=file_name,
                file=report_json_bytes,
                file_options={
                    "content-type": "application/json",
                    "upsert": "true",  # 동일 파일명 존재 시 덮어쓰기
                },
            )
        )

        if hasattr(upload_response, "error") and upload_response.error:
            raise RuntimeError(f"Storage 업로드 실패: {upload_response.error}")

        # 업로드된 파일의 공개 URL 반환
        public_url = (
            client.storage
            .from_(bucket_name)
            .get_public_url(file_name)
        )
        return public_url

    # 동기 함수를 스레드풀에서 실행하여 이벤트루프 블로킹 방지
    return await asyncio.to_thread(_upload)
