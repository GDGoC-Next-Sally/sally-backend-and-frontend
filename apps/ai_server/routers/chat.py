"""
routers/chat.py — AI 서버 API 엔드포인트 모음
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ai_server.models import ChatRequest, TeacherSummary, EndSessionRequest, EndSessionResponse, UpdateRealtimeRequest
from ai_server.services.llm_service import stream_chat, analyze_student
from ai_server.services.report_builder import generate_final_report
from ai_server.services.storage_client import upload_report
from ai_server.services.db_client import (
    get_dialog,
    mark_dialog_analyzed,
    save_student_report,
    update_real_time_analysis,
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


@router.post("/update-realtime")
async def update_realtime(request: UpdateRealtimeRequest):
    """
    [NestJS 백엔드 → 이 API] 실시간 분석 결과 DB 업데이트 전용 엔드포인트
    
    요청(Request):
        - session_id: 수업 세션 ID
        - student_id: 학생 UUID
        - analysis: /analyze 에서 반환된 TeacherSummary JSON 객체
        
    응답(Response):
        - status: "ok"
    """
    try:
        dialog = await get_dialog(
            session_id=request.session_id,
            student_id=request.student_id,
        )
        if not dialog:
            raise HTTPException(status_code=404, detail="해당 session_id와 student_id에 매칭되는 대화(dialog)를 찾을 수 없습니다.")
            
        summary_dict = request.analysis.model_dump() if hasattr(request.analysis, "model_dump") else request.analysis.dict()
        await update_real_time_analysis(dialog["id"], summary_dict)
        return {"status": "ok", "dialog_id": dialog["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 업데이트 실패: {str(e)}")


@router.post("/end-session", response_model=EndSessionResponse)
async def end_session(request: EndSessionRequest):
    """
    [NestJS 백엔드 → 이 API] 대화 종료 및 최종 리포트 생성 엔드포인트

    대화가 완전히 종료되었을 때 NestJS 백엔드가 호출합니다.
    누적된 teacher_summary 목록을 분석하여 FinalReport를 생성한 뒤:
      1. student_reports 테이블의 content 컬럼에 JSON 데이터를 직접 삽입합니다.
      2. dialogs 테이블의 is_analyzed 플래그를 true로 업데이트합니다.
      (※ Supabase Storage 파일 업로드 방식은 사용 중지됨)

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

    # ── Step 2: dialog 정보 조회 (dialog_id 획득) ────────────────────────────
    dialog_id = None
    if request.student_id:
        try:
            dialog = await get_dialog(
                session_id=request.session_id,
                student_id=request.student_id,
            )
            if dialog:
                dialog_id = dialog["id"]
        except Exception as e:
            print(f"[WARN] dialog 조회 실패: {e}")

    # ── Step 3: student_reports 테이블에 리포트 JSON 직접 저장 ───────────────
    if dialog_id and request.student_id:
        try:
            # Pydantic 모델을 딕셔너리로 변환하여 저장
            report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
            await save_student_report(
                student_id=request.student_id,
                session_id=request.session_id,
                dialog_id=dialog_id,
                content=report_dict
            )
        except Exception as e:
            print(f"[WARN] student_reports 저장 실패: {e}")

    # ── Step 4: dialogs.is_analyzed = true 업데이트 ─────────────────────────
    if dialog_id:
        try:
            await mark_dialog_analyzed(dialog_id)
        except Exception as e:
            print(f"[WARN] is_analyzed 업데이트 실패: {e}")

    # (참고) 이전 Supabase Storage 업로드 로직은 일단 비활성화(주석 처리) 해둡니다.
    # report_url = ""
    # try:
    #     report_url = await upload_report(report)
    #     if report_url and request.student_id:
    #         student_part = request.student_id.replace("-", "")
    #         file_name = f"report_{request.session_id}_{student_part}.json"
    #         from ai_server.services.db_client import save_report_file_url
    #         await save_report_file_url(request.session_id, file_name, report_url)
    # except Exception as e:
    #     print(f"[WARN] Storage 업로드 로직 무시됨: {e}")

    return EndSessionResponse(
        status="ok",
        session_id=str(request.session_id),
        report=report,
        report_url="", # 더 이상 파일 URL을 생성하지 않으므로 빈 문자열 반환
    )
