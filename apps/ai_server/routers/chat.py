"""
routers/chat.py — /generate-reply API 엔드포인트
Next.js 백엔드에서 이 URL로 POST 요청을 보내면 AI 분석 결과를 반환합니다.
"""
from fastapi import APIRouter, HTTPException
from ai_server.models import ChatRequest, ChatResponse
from ai_server.services.llm_service import call_llm

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
