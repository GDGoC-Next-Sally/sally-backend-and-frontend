"""
routers/chat.py — AI 서버 API 엔드포인트 모음
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ai_server.models import ChatRequest, TeacherSummary, EndSessionRequest, EndSessionResponse
from ai_server.services.llm_service import stream_chat, analyze_student
from ai_server.services.report_builder import generate_final_report
from ai_server.services.storage_client import upload_report
from ai_server.services.db_client import (
    get_dialog,
    mark_dialog_analyzed,
    save_report_file_url,
)

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    """
    [NestJS 백엔드 → 이 API] 학생과의 실시간 채팅 (스트리밍) 엔드포인트
    
    요청(Request):
        - conversation_history: 대화 기록 배열
        - student_profile: 학생 프로파일
        
    응답(Response):
        - StreamingResponse: AI의 텍스트 답변이 청크 단위로 스트리밍 됨 (Server-Sent Events 스타일)
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="conversation_history가 비어있습니다.")

    try:
        generator = stream_chat(
            conversation_history=request.conversation_history,
            student_profile=request.student_profile,
        )
        return StreamingResponse(generator, media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 채팅 스트리밍 실패: {str(e)}")


@router.post("/analyze", response_model=TeacherSummary)
async def analyze(request: ChatRequest):
    """
    [NestJS 백엔드 → 이 API] 학생 상태 실시간 분석 (백그라운드) 엔드포인트
    
    요청(Request):
        - conversation_history: 방금 AI가 한 대답까지 포함된 전체 대화 기록
        - student_profile: 학생 프로파일
        
    응답(Response):
        - TeacherSummary: 교사 대시보드용 분석 데이터 JSON
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="conversation_history가 비어있습니다.")

    try:
        summary = await analyze_student(
            conversation_history=request.conversation_history,
            student_profile=request.student_profile,
        )
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 학생 분석 실패: {str(e)}")


@router.post("/end-session", response_model=EndSessionResponse)
async def end_session(request: EndSessionRequest):
    """
    [NestJS 백엔드 → 이 API] 대화 종료 및 최종 리포트 생성 엔드포인트

    대화가 완전히 종료되었을 때 NestJS 백엔드가 호출합니다.
    누적된 teacher_summary 목록을 분석하여 FinalReport를 생성한 뒤:
      1. Supabase Storage에 JSON 파일로 업로드
      2. supplementary_data 테이블에 파일 URL 저장
      3. dialogs 테이블의 is_analyzed 플래그를 true로 업데이트

    요청(Request):
        - session_id: 수업 세션 ID (int)
        - student_id: 학생 UUID
        - summaries: 대화 전체의 teacher_summary 누적 목록
        - student_profile: 학생 프로파일 (선택)

    응답(Response):
        - status: "ok"
        - session_id: 세션 ID
        - report: 최종 리포트 데이터 (FinalReport)
        - report_url: Supabase Storage에 업로드된 파일 공개 URL
    """
    if not request.summaries:
        raise HTTPException(status_code=400, detail="summaries가 비어있습니다. 대화 기록이 없습니다.")

    # ── Step 1: FinalReport 생성 ─────────────────────────────────────────────
    try:
        report = generate_final_report(
            session_id=str(request.session_id),
            summaries=request.summaries,
            student_id=request.student_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"리포트 생성 실패: {str(e)}")

    # ── Step 2: Supabase Storage에 JSON 파일 업로드 ──────────────────────────
    report_url: str = ""
    try:
        report_url = await upload_report(report)
    except Exception as e:
        # Storage 업로드 실패해도 리포트 자체는 반환 (비치명적 오류)
        print(f"[WARN] Storage 업로드 실패 (리포트는 정상 반환): {e}")

    # ── Step 3: supplementary_data 테이블에 파일 URL 저장 ───────────────────
    if report_url and request.student_id:
        try:
            student_part = request.student_id.replace("-", "")
            file_name = f"report_{request.session_id}_{student_part}.json"
            await save_report_file_url(
                session_id=request.session_id,
                file_name=file_name,
                file_url=report_url,
            )
        except Exception as e:
            print(f"[WARN] DB 파일 URL 저장 실패: {e}")

    # ── Step 4: dialogs.is_analyzed = true 업데이트 ─────────────────────────
    if request.student_id:
        try:
            dialog = await get_dialog(
                session_id=request.session_id,
                student_id=request.student_id,
            )
            if dialog:
                await mark_dialog_analyzed(dialog["id"])
        except Exception as e:
            print(f"[WARN] is_analyzed 업데이트 실패: {e}")

    return EndSessionResponse(
        status="ok",
        session_id=str(request.session_id),
        report=report,
        report_url=report_url,
    )
