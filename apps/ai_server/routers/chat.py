"""
routers/chat.py — AI 서버 API 엔드포인트 모음
"""
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ai_server.models import ChatRequest, TeacherSummary, EndSessionRequest, EndSessionResponse, UpdateRealtimeRequest, RealtimeAnalysis
from ai_server.services.llm_service import stream_chat, analyze_student
from ai_server.services.report_builder import generate_final_report
from ai_server.services.storage_client import upload_report
from ai_server.services.callback_client import notify_backend_analytics_callback
from ai_server.services.db_client import (
    get_dialog,
    mark_dialog_analyzed,
    save_student_report,
    update_real_time_analysis,
    append_real_time_analysis,
    get_real_time_analyses,
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


@router.post("/analyze", response_model=RealtimeAnalysis)
async def analyze(request: ChatRequest):
    """
    [NestJS 백엔드 → 이 API] 학생 상태 실시간 분석 (백그라운드) 엔드포인트
    
    요청(Request):
        - conversation_history: 방금 AI가 한 대답까지 포함된 전체 대화 기록
        - student_profile: 학생 프로파일
        - session_id: (선택) 수업 세션 ID — dialog 조회 및 백엔드 콜백에 사용
        - student_id: (선택) 학생 UUID — dialog 조회 및 백엔드 콜백에 사용
        
    응답(Response):
        - TeacherSummary: 교사 대시보드용 분석 데이터 JSON
        
    사이드이펙트:
        - session_id + student_id가 모두 제공된 경우, 분석 완료 후
          NestJS 백엔드의 POST /livechat/analytics-callback을 비동기로 호출합니다.
          (콜백 실패 시에도 이 API의 응답에는 영향을 주지 않습니다.)
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="conversation_history가 비어있습니다.")

    session_id = getattr(request, "session_id", None)
    student_id = getattr(request, "student_id", None)

    # ── 직전 분석 결과 조회 (연속성 참고용) ────────────────────────────────
    previous_summary = None
    if session_id and student_id:
        try:
            dialog = await get_dialog(session_id=session_id, student_id=student_id)
            if dialog:
                raw_list = await get_real_time_analyses(dialog["id"])
                if raw_list:
                    previous_summary = RealtimeAnalysis(**raw_list[-1])
        except Exception as e:
            print(f"[WARN] 직전 분석 결과 조회 실패 (session_id={session_id}): {e}")

    try:
        summary = await analyze_student(
            conversation_history=request.conversation_history,
            student_profile=request.student_profile,
            previous_summary=previous_summary,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 학생 분석 실패: {str(e)}")

    # ── 분석 완료 후 NestJS 백엔드 콜백 (Fire-and-Forget) ────────────────────
    # session_id와 student_id가 모두 있을 때만 dialog를 조회하여 콜백 전송

    if session_id and student_id:
        async def _send_callback():
            try:
                dialog = await get_dialog(session_id=session_id, student_id=student_id)
                if dialog:
                    analysis_dict = summary.model_dump() if hasattr(summary, "model_dump") else summary.dict()
                    await notify_backend_analytics_callback(
                        dialog_id=dialog["id"],
                        analysis=analysis_dict,
                    )
            except Exception as e:
                print(f"[WARN] 백엔드 콜백 전송 실패 (session_id={session_id}): {e}")

        # 응답을 블로킹하지 않고 백그라운드에서 실행
        asyncio.create_task(_send_callback())

    return summary


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
        await append_real_time_analysis(dialog["id"], summary_dict)  # 덮어쓰기 → 배열 누적 저장
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
    # ── Step 1: dialog 정보 조회 (dialog_id 획득) ────────────────────────────
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

    # ── Step 2: DB에서 summaries 직접 읽기 (프론트 전달 불필요) ──────────────
    summaries_from_db: list[TeacherSummary] = []
    if dialog_id:
        try:
            raw_list = await get_real_time_analyses(dialog_id)
            summaries_from_db = [TeacherSummary(**item) for item in raw_list]
        except Exception as e:
            print(f"[WARN] DB에서 summaries 읽기 실패: {e}")

    # 프론트가 summaries를 직접 보낸 경우 DB 데이터보다 우선 사용 (하위 호환)
    summaries = request.summaries if request.summaries else summaries_from_db

    if not summaries:
        raise HTTPException(status_code=400, detail="분석 데이터가 없습니다. /update-realtime이 먼저 호출되어야 합니다.")

    # ── Step 3: FinalReport 생성 ─────────────────────────────────────────────
    try:
        report = await generate_final_report(
            session_id=str(request.session_id),
            summaries=summaries,
            student_id=request.student_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"리포트 생성 실패: {str(e)}")

    # ── Step 4: student_reports 테이블에 리포트 JSON 직접 저장 ───────────────
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

    # ── Step 5: dialogs.is_analyzed = true 업데이트 ─────────────────────────
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
