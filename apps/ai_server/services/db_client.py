"""
services/db_client.py — Supabase DB 연결 및 데이터 조회/저장

수정 사항:
  - asyncio.to_thread()로 동기 supabase 호출을 스레드풀에서 실행 (이벤트루프 블로킹 방지)
  - .single() 결과 없을 때 예외 처리 추가 (PostgrestAPIError → None 반환)

관련 테이블 (schema.prisma 기준):
  - sessions: 수업 세션 정보 + unit_prompt 연결
  - unit_prompts: AI 시스템 프롬프트 원문
  - dialogs: 학생별 대화 컨테이너 (session_id + student_id)
  - chat_messages: 대화 내 개별 메시지
  - supplementary_data: 리포트 파일 URL 저장
"""
import os
import asyncio
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# ai_server/.env 파일을 정확히 찾도록 경로 명시
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

_supabase_client: Optional[Client] = None

def _get_db() -> Client:
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


def _safe_single(response) -> Optional[dict]:
    """
    .single() 결과를 안전하게 반환합니다.
    결과가 없을 때 예외 대신 None을 반환합니다.
    """
    try:
        return response.data if response.data else None
    except Exception:
        return None


# ── 세션 조회 ──────────────────────────────────────────────────────────────────

async def get_session_with_prompt(session_id: int) -> Optional[dict]:
    """
    session_id로 세션 정보와 연결된 unit_prompt(수업 목적/프롬프트)를 함께 조회합니다.

    Returns:
        {
          "id": 1,
          "session_name": "...",
          "unit_prompts": { "objective": "...", "prompt": "..." }
        }
        또는 None (세션이 없을 경우)
    """
    def _query():
        try:
            db = _get_db()
            response = (
                db.table("sessions")
                .select("id, session_name, status, unit_prompt_id, unit_prompts(objective, prompt)")
                .eq("id", session_id)
                .single()
                .execute()
            )
            return _safe_single(response)
        except Exception:
            # 세션이 없거나 DB 오류 시 None 반환
            return None

    return await asyncio.to_thread(_query)


# ── 대화(Dialog) 조회 ──────────────────────────────────────────────────────────

async def get_dialog(session_id: int, student_id: str) -> Optional[dict]:
    """
    session_id + student_id로 해당 학생의 대화(dialog) 정보를 조회합니다.

    Returns:
        { "id": 1, "session_id": 1, "student_id": "uuid", "is_analyzed": false }
        또는 None (대화 기록이 없을 경우)
    """
    def _query():
        try:
            db = _get_db()
            response = (
                db.table("dialogs")
                .select("id, session_id, student_id, is_analyzed, status")
                .eq("session_id", session_id)
                .eq("student_id", student_id)
                .single()
                .execute()
            )
            return _safe_single(response)
        except Exception:
            return None

    return await asyncio.to_thread(_query)


async def get_chat_messages(dialog_id: int) -> list[dict]:
    """
    dialog_id로 해당 대화의 모든 채팅 메시지를 시간순으로 조회합니다.
    AI 서버가 conversation_history를 직접 구성할 때 사용합니다.

    Returns:
        [
          { "sender_type": "STUDENT", "content": "...", "created_at": "..." },
          ...
        ]
    """
    def _query():
        try:
            db = _get_db()
            response = (
                db.table("chat_messages")
                .select("sender_type, content, created_at")
                .eq("dialog_id", dialog_id)
                .order("created_at", desc=False)
                .execute()
            )
            return response.data or []
        except Exception:
            return []

    return await asyncio.to_thread(_query)


async def update_real_time_analysis(dialog_id: int, analysis_json: dict) -> None:
    """
    /analyze 요청 직후 생성된 실시간 분석 결과(JSON)를 dialogs 테이블에 업데이트합니다.
    (단일 객체 덮어쓰기 — 하위 호환용, 신규 코드는 append_real_time_analysis 사용)
    """
    def _query():
        try:
            db = _get_db()
            db.table("dialogs").update({"real_time_analysis": analysis_json}).eq("id", dialog_id).execute()
        except Exception as e:
            print(f"[WARN] update_real_time_analysis 실패: {e}")

    await asyncio.to_thread(_query)


async def append_real_time_analysis(dialog_id: int, analysis_json: dict) -> None:
    """
    매 턴마다 RealtimeAnalysis 분석 결과를 JSON 배열로 누적 저장합니다.
    기존 배열을 읽어 새 항목을 append한 뒤 전체를 다시 저장합니다.

    저장 구조:
        real_time_analysis: [
            { ...1턴 RealtimeAnalysis... },
            { ...2턴 RealtimeAnalysis... },
            ...
        ]
    """
    def _query():
        try:
            db = _get_db()
            # 기존 배열 읽기
            row = (
                db.table("dialogs")
                .select("real_time_analysis")
                .eq("id", dialog_id)
                .single()
                .execute()
            )
            existing = row.data.get("real_time_analysis") if row.data else None

            # 기존 값이 배열이면 그대로 사용, 단일 객체거나 None이면 빈 배열로 초기화
            if isinstance(existing, list):
                updated = existing + [analysis_json]
            else:
                updated = [analysis_json]

            db.table("dialogs").update({"real_time_analysis": updated}).eq("id", dialog_id).execute()
        except Exception as e:
            print(f"[WARN] append_real_time_analysis 실패: {e}")

    await asyncio.to_thread(_query)


async def get_real_time_analyses(dialog_id: int) -> list[dict]:
    """
    dialog_id로 누적 저장된 전체 RealtimeAnalysis 배열을 조회합니다.
    /end-session에서 프론트가 summaries를 보내지 않아도 DB에서 직접 읽어올 때 사용합니다.

    Returns:
        [{ ...RealtimeAnalysis 1턴... }, { ...2턴... }, ...] 또는 []
    """
    def _query():
        try:
            db = _get_db()
            row = (
                db.table("dialogs")
                .select("real_time_analysis")
                .eq("id", dialog_id)
                .single()
                .execute()
            )
            if not row.data:
                return []
            data = row.data.get("real_time_analysis")
            if isinstance(data, list):
                return data
            # 구버전 단일 객체 방식으로 저장된 경우 배열로 래핑
            if isinstance(data, dict):
                return [data]
            return []
        except Exception:
            return []

    return await asyncio.to_thread(_query)

async def mark_dialog_analyzed(dialog_id: int, real_time_analysis: dict = None) -> None:
    """
    리포트 생성 완료 후 해당 대화의 is_analyzed 플래그를 true로 업데이트합니다.
    real_time_analysis 값이 주어지면 함께 업데이트합니다.
    """
    def _query():
        try:
            db = _get_db()
            update_data = {"is_analyzed": True}
            if real_time_analysis is not None:
                update_data["real_time_analysis"] = real_time_analysis
            db.table("dialogs").update(update_data).eq("id", dialog_id).execute()
        except Exception as e:
            print(f"[WARN] mark_dialog_analyzed 실패: {e}")

    await asyncio.to_thread(_query)

# ── 리포트 파일 URL 저장 ───────────────────────────────────────────────────────

async def save_report_file_url(
    session_id: int,
    file_name: str,
    file_url: str,
    file_type: str = "application/json",
) -> None:
    """
    (Deprecated) Storage에 업로드된 리포트 파일 URL을 supplementary_data 테이블에 저장합니다.
    """
    def _query():
        try:
            db = _get_db()
            db.table("supplementary_data").insert({
                "session_id": session_id,
                "file_name": file_name,
                "file_url": file_url,
                "file_type": file_type,
            }).execute()
        except Exception as e:
            print(f"[WARN] save_report_file_url 실패: {e}")

    await asyncio.to_thread(_query)


# ── 학생 리포트 JSON 직접 저장 (신규 테이블 대응) ──────────────────────────────

async def save_student_report(
    student_id: str,
    session_id: int,
    dialog_id: int,
    content: dict,
) -> None:
    """
    백엔드가 새로 생성한 student_reports 테이블에 JSON 데이터를 직접 삽입합니다.
    """
    def _query():
        try:
            db = _get_db()
            db.table("student_reports").insert({
                "student_id": student_id,
                "session_id": session_id,
                "dialog_id": dialog_id,
                "content": content,
            }).execute()
        except Exception as e:
            print(f"[WARN] save_student_report 실패: {e}")

    await asyncio.to_thread(_query)


async def save_session_report(
    session_id: int,
    content: dict,
) -> None:
    """
    세션 전체 요약 리포트를 session_reports 테이블에 저장합니다.
    session_id는 unique key이므로 같은 세션에서 재생성하면 기존 리포트를 갱신합니다.
    """
    def _query():
        db = _get_db()
        db.table("session_reports").upsert(
            {
                "session_id": session_id,
                "content": content,
            },
            on_conflict="session_id",
        ).execute()

    await asyncio.to_thread(_query)
