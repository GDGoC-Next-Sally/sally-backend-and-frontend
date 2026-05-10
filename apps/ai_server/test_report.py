"""
test_report.py - 학생별 최종 리포트 생성 파이프라인 테스트

실행 방법:
    cd apps/ai_server
    .venv/bin/python test_report.py
"""
import asyncio
import json
from ai_server.services.report_builder import generate_final_report

# 테스트용 가짜 채팅 데이터
# 의도적으로 학생의 오개념과 약점, 개선 과정을 담았습니다.
MOCK_CHAT_MESSAGES = [
    {"role": "assistant", "content": "안녕하세요! 오늘은 관계대명사에 대해 배워볼 거예요. 혹시 관계대명사가 무엇인지 들어본 적 있나요?"},
    {"role": "student", "content": "음... 문장 두 개를 연결해주는 거 아닌가요?"},
    {"role": "assistant", "content": "맞아요! 문장을 연결하면서 동시에 대명사 역할을 하죠. 예를 들어 'I know a boy'와 'He likes apples'를 연결해볼까요?"},
    {"role": "student", "content": "I know a boy he likes apples... 이렇게요?"},
    {"role": "assistant", "content": "거의 다 왔어요! 접속사와 대명사 'he'를 합쳐서 관계대명사 'who'로 바꿔주면 된답니다."},
    {"role": "student", "content": "아~ I know a boy who likes apples. 이거네요!"},
    {"role": "assistant", "content": "정답이에요! 그럼 이번엔 목적격 관계대명사를 알아볼까요? 'This is the book'과 'I bought it yesterday'를 연결해보세요."},
    {"role": "student", "content": "This is the book which I bought it yesterday."},
    {"role": "assistant", "content": "관계대명사 'which'를 잘 썼어요! 하지만 'it'이 'which'로 바뀌어서 앞으로 나간 것이기 때문에, 뒤에 'it'을 한 번 더 쓰면 안 돼요."},
    {"role": "student", "content": "아, 그러면 This is the book which I bought yesterday 구나. 뒤에 it을 빼야 되는군요."},
    {"role": "assistant", "content": "완벽해요! 그리고 목적격 관계대명사인 'which'는 생략할 수도 있어요."},
    {"role": "student", "content": "그러면 주격 관계대명사 who도 생략할 수 있나요?"},
    {"role": "assistant", "content": "아니요, 주격 관계대명사는 혼자서는 생략할 수 없어요. 목적격 관계대명사만 단독 생략이 가능해요."},
    {"role": "student", "content": "아하, 주격은 생략 안 되고 목적격만 생략되는 거군요. 알겠습니다."}
]

async def main():
    print("\n" + "=" * 55)
    print("📝 학생별 최종 리포트 생성 테스트")
    print("=" * 55)
    
    print("[INFO] 테스트 대화 내용:")
    for msg in MOCK_CHAT_MESSAGES:
        role = "👱 학생" if msg["role"] == "student" else "🤖 Sally"
        print(f"{role}: {msg['content']}")
    
    print("\n[INFO] 리포트 생성 중 (LLM 호출)...")
    
    try:
        report = await generate_final_report(
            chat_messages=MOCK_CHAT_MESSAGES,
            session_id="test_session_001",
            student_id="test_student_001"
        )
        
        print("\n" + "=" * 55)
        print("✅ [생성 완료] 학생별 리포트 결과")
        print("=" * 55)
        
        # Pydantic 모델을 예쁘게 JSON 형식으로 출력
        report_dict = report.model_dump() if hasattr(report, "model_dump") else report.dict()
        print(json.dumps(report_dict, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"\n[ERROR] 리포트 생성 테스트 실패: {e}")

if __name__ == "__main__":
    asyncio.run(main())
