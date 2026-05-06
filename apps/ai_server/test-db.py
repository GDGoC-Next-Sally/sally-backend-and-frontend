import asyncio
from ai_server.services.db_client import get_supabase_client

async def main():
    client = get_supabase_client()
    response = client.table('dialogs').select('session_id, student_id').limit(1).execute()
    if response.data:
        print("DB 데이터 확인 결과:", response.data[0])
    else:
        print("DB에 아직 대화(dialogs) 데이터가 없습니다.")

asyncio.run(main())
