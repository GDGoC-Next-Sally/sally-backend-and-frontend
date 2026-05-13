"""
routers/chat.py — AI 서버 API 엔드포인트 모음
"""
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ai_server.models import ChatRequest, EndSessionRequest, EndSessionResponse, RealtimeAnalysis, SessionReportRequest, SessionReportResponse
from ai_server.services.llm_service import stream_chat, analyze_student
from ai_server.services.callback_client import (
    notify_backend_analytics_callback,
    notify_backend_session_report_callback,
    notify_backend_student_report_callback,
)

from ai_server.services.report_builder import (
    generate_final_report,
    normalize_chat_messages,
)
from ai_server.services.session_report_builder import generate_session_report
from ai_server.services.db_client import (
    get_dialog,
    get_chat_messages,
    mark_dialog_analyzed,
    get_real_time_analyses,
    save_student_report,
    save_session_report,
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
            need_intervention=request.need_intervention or False,  # 방향 B: 시스템 개입 필요 신호 전달
            conversation_summary=request.conversation_summary,
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
        - RealtimeAnalysis: 교사 대시보드용 실시간 분석 데이터 JSON
        
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
                    
                    # 백엔드로 콜백 전송 (백엔드가 Socket 알림 및 DB 저장을 모두 처리함)
                    await notify_backend_analytics_callback(
                        dialog_id=dialog["id"],
                        analysis=analysis_dict,
                    )
            except Exception as e:
                print(f"[WARN] 백엔드 콜백 전송 실패 (session_id={session_id}): {e}")

        # 응답을 블로킹하지 않고 백그라운드에서 실행
        asyncio.create_task(_send_callback())

    return summary


@router.post("/session-report", response_model=SessionReportResponse)
async def session_report(request: SessionReportRequest):
    """
    [NestJS 백엔드 → AI Server] 세션별 전체 학생 리포트 생성 엔드포인트

    요청:
        - session_id: 세션 ID
        - students: 학생별 채팅 기록 목록

    응답:
        - 기존 호환용 SessionReportResponse

    사이드이펙트:
        - 생성된 세션 리포트를 NestJS 백엔드의
          POST /reports/session-report-callback 으로 전송합니다.
    """
    if request.session_id is None:
        raise HTTPException(status_code=400, detail="session_id가 필요합니다.")

    if not request.students:
        raise HTTPException(status_code=400, detail="students가 비어있습니다.")

    try:
        report = await generate_session_report(
            students=request.students,
            session_id=str(request.session_id),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"세션 전체 리포트 생성 실패: {str(e)}",
        )

    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    
    # DB에 직접 저장 (session_reports 테이블)
    await save_session_report(
        session_id=request.session_id,
        content=report_dict,
    )

    callback_ok = await notify_backend_session_report_callback(
        session_id=request.session_id,
        report=report_dict,
    )
    if not callback_ok:
        raise HTTPException(
            status_code=502,
            detail="세션 전체 리포트 백엔드 콜백 전송 실패",
        )

    return SessionReportResponse(
        status="ok",
        session_id=str(request.session_id),
        report=report,
    )

@router.post("/end-session", response_model=EndSessionResponse)
async def end_session(request: EndSessionRequest):
    """
    [NestJS 백엔드 → AI Server] 대화 종료 및 학생별 최종 리포트 생성 엔드포인트

    처리 흐름:
      1. session_id + student_id로 dialog 조회
      2. dialog_id 기준으로 chat_messages 조회
      3. chat_messages를 FinalReport 생성용 포맷으로 정규화
      4. 학생 메시지 존재 여부 확인
      5. optional real_time_analysis 조회
      6. 토큰 수 추정 및 짧은 세션/긴 세션 분기 처리하여 FinalReport 생성
      7. NestJS 백엔드의 POST /reports/student-report-callback 으로 리포트 전송
      8. dialogs.is_analyzed = true 업데이트
      9. 기존 호환용 EndSessionResponse 반환
    """

    # Step 0. request 검증
    if not request.student_id:
        raise HTTPException(
            status_code=400,
            detail="student_id가 필요합니다. 학생별 리포트는 session_id + student_id 기준으로 생성됩니다."
        )

    # Step 1. dialog 정보 조회
    try:
        dialog = await get_dialog(
            session_id=request.session_id,
            student_id=request.student_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"dialog 조회 중 오류가 발생했습니다: {str(e)}"
        )

    if not dialog:
        raise HTTPException(
            status_code=404,
            detail="dialog를 찾을 수 없습니다. session_id와 student_id를 확인하세요."
        )

    dialog_id = dialog["id"]

    # Step 2. chat_messages 조회
    try:
        raw_messages = await get_chat_messages(dialog_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"chat_messages 조회 중 오류가 발생했습니다: {str(e)}"
        )

    if not raw_messages:
        raise HTTPException(
            status_code=400,
            detail="채팅 메시지가 없습니다. 대화 기록이 저장되었는지 확인하세요."
        )

    # Step 3. chat_messages 정규화
    chat_messages = normalize_chat_messages(raw_messages)

    student_message_count = sum(
        1 for msg in chat_messages
        if msg.get("role") == "student" and msg.get("content", "").strip()
    )

    if student_message_count == 0:
        raise HTTPException(
            status_code=400,
            detail="학생 메시지가 없어 학생별 리포트를 생성할 수 없습니다."
        )

    # Step 4. optional realtime summaries 조회
    realtime_summaries = None
    try:
        realtime_summaries = await get_real_time_analyses(
            dialog_id=dialog_id
        )
    except Exception as e:
        print(f"[WARN] real_time_analysis 조회 실패: {e}")

    # Step 5. FinalReport 생성
    try:
        report = await generate_final_report(
            chat_messages=chat_messages,
            realtime_summaries=realtime_summaries,
            session_id=str(request.session_id),
            student_id=request.student_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"리포트 생성 실패: {str(e)}"
        )

    # Step 6. 백엔드 학생 리포트 콜백 전송
    report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
    
    # DB에 직접 저장 (student_reports 테이블)
    await save_student_report(
        student_id=request.student_id,
        session_id=request.session_id,
        dialog_id=dialog_id,
        content=report_dict,
    )

    callback_ok = await notify_backend_student_report_callback(
        session_id=request.session_id,
        student_id=request.student_id,
        report=report_dict,
    )
    if not callback_ok:
        raise HTTPException(
            status_code=502,
            detail="학생별 리포트 백엔드 콜백 전송 실패",
        )

    # Step 7. dialog 분석 완료 처리
    try:
        await mark_dialog_analyzed(dialog_id)
    except Exception as e:
        print(f"[WARN] is_analyzed 업데이트 실패: {e}")

    # Step 8. 응답 반환
    return EndSessionResponse(
        status="ok",
        session_id=str(request.session_id),
        student_id=request.student_id,
        report=report,
    )
