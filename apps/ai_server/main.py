"""
main.py — FastAPI 앱 진입점
uvicorn으로 이 파일을 실행하면 AI 서버가 시작됩니다.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ai_server.routers import chat

app = FastAPI(
    title="Sally AI Server",
    description="Sally AI 코치 플랫폼의 AI 추론 전용 서버입니다. Next.js 백엔드에서 호출합니다.",
    version="1.0.0",
)

# ── CORS 설정 (Next.js 백엔드가 이 서버를 호출할 수 있도록 허용) ──────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js 개발 서버
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 라우터 등록 ──────────────────────────────────────────────────────────────
app.include_router(chat.router, prefix="/api", tags=["AI 코치"])


@app.get("/", tags=["헬스체크"])
def root():
    return {"status": "ok", "message": "Sally AI Server is running 🚀"}
