"""
routers/chat.py — AI 서버 API 엔드포인트 모음
"""
from fastapi import APIRouter, HTTPException
from ai_server.models import ChatRequest, ChatResponse, EndSessionRequest, EndSessionResponse
from ai_server.services.llm_service import call_llm
from ai_server.services.report_builder import generate_final_report

router = APIRouter()


@router.post("/generate-reply", response_model=ChatResponse)
async def generate_reply(request: ChatRequest):
    """
    [Next.js 백엔드 → 이 API] 채팅 분석 엔드포인트

    요청(Request):
        - conversation_history: 대화 기록 배열 [{"role": "user"/"model", "text": "..."}]
        - student_profile: 학생 프로파일 (없으면 기본값 사용)

    응답(Response):
        - reply: 학생에게 보여줄 AI 답변 텍스트
        - teacher_summary: 교사 대시보드용 분석 데이터 (감정, 이해도 점수 등)
        - raw_text: LLM 원본 응답 (디버깅용)
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="conversation_history가 비어있습니다.")

    try:
        result = await call_llm(
            conversation_history=request.conversation_history,
            student_profile=request.student_profile,
        )
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM 호출 실패: {str(e)}")


@router.post("/end-session", response_model=EndSessionResponse)
async def end_session(request: EndSessionRequest):
    """
    [NestJS 백엔드 → 이 API] 대화 종료 및 최종 리포트 생성 엔드포인트

    대화가 완전히 종료되었을 때 NestJS 백엔드가 호출합니다.
    누적된 teacher_summary 목록을 분석하여 최종 수업 리포트 JSON을 반환합니다.

    요청(Request):
        - session_id: 세션 고유 ID
        - student_id: 학생 ID (선택)
        - summaries: 대화 전체의 teacher_summary 누적 목록
        - student_profile: 학생 프로파일 (선택)

    응답(Response):
        - status: "ok"
        - session_id: 세션 ID
        - report: 최종 리포트 데이터 (FinalReport)
    """
    if not request.summaries:
        raise HTTPException(status_code=400, detail="summaries가 비어있습니다. 대화 기록이 없습니다.")

    try:
        report = generate_final_report(
            session_id=request.session_id,
            summaries=request.summaries,
            student_id=request.student_id,
        )
        return EndSessionResponse(
            status="ok",
            session_id=request.session_id,
            report=report,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"리포트 생성 실패: {str(e)}")

