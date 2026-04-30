"""
models.py — FastAPI 요청/응답 데이터 구조 정의
JS의 studentProfile, conversationHistory 구조를 파이썬 타입으로 변환합니다.
"""
from pydantic import BaseModel
from typing import Optional, List


# ── 학생 프로파일 (JS의 studentProfile 객체에 대응) ──────────────────────────
class StudentProfile(BaseModel):
    subject: Optional[str] = "미설정"
    scope: Optional[str] = "미설정"
    key_concepts: Optional[str] = "미설정"
    learning_objectives: Optional[str] = "미설정"
    learning_style: Optional[str] = "미설정"
    forbidden_topics: Optional[str] = "미설정"
    topic_hints: Optional[List[str]] = []
    misconception_tag_hints: Optional[List[str]] = []


# ── 대화 기록 한 턴 (JS의 conversationHistory 배열 원소에 대응) ──────────────
class ConversationTurn(BaseModel):
    role: str      # "user" | "model" (JS와 동일)
    text: str


# ── /generate-reply API 요청 바디 ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_history: List[ConversationTurn]
    student_profile: Optional[StudentProfile] = None


# ── TEACHER_SUMMARY 파싱 결과 ─────────────────────────────────────────────────
class TeacherSummary(BaseModel):
    frustration_delta: Optional[int] = 0
    student_understood: Optional[bool] = True
    is_hallucination_risk: Optional[bool] = False
    understanding_score: Optional[int] = 5
    current_topic: Optional[str] = None
    student_emotion: Optional[str] = None
    internal_reasoning: Optional[str] = None
    one_line_summary: Optional[str] = None
    question_intent: Optional[str] = None
    confusion_type: Optional[str] = None
    misconception_tag: Optional[str] = None
    learning_mode: Optional[str] = None


# ── /generate-reply API 응답 바디 ─────────────────────────────────────────────
class ChatResponse(BaseModel):
    reply: str                        # 학생에게 보여줄 AI 답변 (HTML 주석 제거 완료)
    teacher_summary: TeacherSummary   # 교사 대시보드용 분석 데이터
    raw_text: str                     # LLM 원본 응답 (디버깅용)
