import asyncio
import os
from dotenv import load_dotenv

from ai_server.models import ChatRequest, ConversationTurn, StudentProfile
from ai_server.services.llm_service import stream_chat

# Load environment variables (OPENAI_API_KEY)
load_dotenv()

async def test_stream_chat():
    profile = StudentProfile(
        subject="영어 문법",
        scope="관계대명사",
        key_concepts="주격과 목적격 관계대명사의 구분",
        learning_objectives="학생이 스스로 who와 which를 구분하여 문장을 만들 수 있다.",
        learning_style="칭찬 위주",
        forbidden_topics="정답을 바로 알려주지 않기"
    )

    history = [
        ConversationTurn(role="model", text="안녕하세요! 오늘은 관계대명사에 대해 배워볼 거예요. 준비됐나요?"),
        ConversationTurn(role="user", text="네 준비됐어요!", sender_type="STUDENT", student_name="지연"),
        ConversationTurn(role="model", text="좋아요! 먼저, 두 문장을 연결할 때 쓰는 말이 무엇인지 아나요?"),
        ConversationTurn(role="user", text="접속사요?", sender_type="STUDENT", student_name="지연"),
        ConversationTurn(role="user", text="접속사도 맞지만, 오늘은 대명사 역할까지 같이 하는 '관계대명사'를 배울 거야. Sally 선생님이 설명해줄게 집중해보자!", sender_type="TEACHER", sender_name="김선생님"),
    ]

    request = ChatRequest(
        conversation_history=history,
        student_profile=profile
    )

    print("======================================================================")
    print("📝 /chat 스트리밍 테스트 (다자간 대화: 학생 + 선생님 개입)")
    print("======================================================================\n")

    for turn in history:
        speaker = "🤖 Sally" if turn.role == "model" else (f"👩‍🏫 {turn.sender_name}" if turn.sender_type == "TEACHER" else f"👱 {turn.student_name}")
        print(f"{speaker}: {turn.text}")

    print("\n[INFO] Sally 응답 스트리밍 시작...\n")
    print("🤖 Sally: ", end="")

    async for chunk in stream_chat(history, profile):
        print(chunk, end="", flush=True)
    
    print("\n\n======================================================================")
    print("✅ 테스트 완료")

if __name__ == "__main__":
    asyncio.run(test_stream_chat())
