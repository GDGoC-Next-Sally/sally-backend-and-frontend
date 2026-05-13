"""
models.py — FastAPI 요청/응답 데이터 구조 정의
JS의 studentProfile, conversationHistory 구조를 파이썬 타입으로 변환합니다.
"""
from pydantic import BaseModel, Field

from typing import Optional, List, Dict, Any


# ── 학생 프로파일 (JS의 studentProfile 객체에 대응) ──────────────────────────
class StudentProfile(BaseModel):
    subject: Optional[str] = "미설정"
    scope: Optional[str] = "미설정"
    key_concepts: Optional[str] = "미설정"
    learning_objectives: Optional[str] = "미설정"
    learning_style: Optional[str] = "미설정"
    forbidden_topics: Optional[str] = "미설정"
    topic_hints: List[str] = Field(default_factory=list)
    misconception_tag_hints: List[str] = Field(default_factory=list)


# ── 대화 기록 한 턴 (JS의 conversationHistory 배열 원소에 대응) ──────────────
class ConversationTurn(BaseModel):
    role: str      # "user" | "model" (JS와 동일)
    text: str
    sender_type: str  # "STUDENT" | "TEACHER" | "AI" | "SYSTEM" (백엔드가 명찰로 추가)
    student_name: Optional[str] = None  # 학생 발화일 때 프롬프트 라벨로 사용할 학생 이름


# ── /chat 및 /analyze API 요청 바디 ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_history: List[ConversationTurn]
    student_profile: Optional[StudentProfile] = None
    conversation_summary: Optional[str] = None  # 긴 대화에서 최근 원문 앞에 붙일 이전 대화 요약 메모리
    # 아래 두 필드는 /analyze 엔드포인트에서 백엔드 콜백 전송에 사용됩니다.
    # NestJS가 호출할 때 함께 전달하면 분석 완료 후 자동으로 콜백이 발송됩니다.
    session_id: Optional[int] = None    # 수업 세션 ID (dialogs 테이블 조회용)
    student_id: Optional[str] = None    # 학생 UUID (dialogs 테이블 조회용)
    need_intervention: Optional[bool] = False  # 교사 개입 필요 여부


# ── 실시간 분석 결과 (5개 핵심 필드, /analyze 엔드포인트 전용) ──────────────
class RealtimeAnalysis(BaseModel):
    understanding_score: Optional[int] = None     # 이해도 (1~10, 판단 불가 시 null)
    current_topic: Optional[str] = None           # 수업 중인 개념
    student_emotion: Optional[str] = None         # 감정
    one_line_summary: Optional[str] = None        # 대화 상태 한 줄 요약
    need_intervention: Optional[bool] = False     # 교사 개입 필요 여부


# ── /end-session API 요청 바디 ────────────────────────────────────────────────
class EndSessionRequest(BaseModel):
    session_id: int                                    # 세션 고유 ID (NestJS DB의 sessions.id)
    student_id: str                # 학생 UUID (dialogs 테이블 조회용)
    student_profile: Optional[StudentProfile] = None  # 학생 프로파일 (선택)


# ── /session-report API 요청 바디 ────────────────────────────────────────────
class StudentSessionChat(BaseModel):
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    chat_messages: List[Dict[str, Any]] = Field(default_factory=list)


class SessionReportRequest(BaseModel):
    session_id: Optional[int] = None
    students: List[StudentSessionChat] = Field(default_factory=list)


# ── 최종 리포트 데이터 구조 ───────────────────────────────────────────────────
class FinalReport(BaseModel):
    key_concepts: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="세션 주요 학습 주제와 학생의 취약 개념 분리 매핑 (주요 학습 개념, 취약 개념)"
    )
    misconception_summary: List[str] = Field(
        default_factory=list,
        description="반복 오개념과 구체적 약점 요약"
    )
    session_summary: str = Field(
        default="",
        description="교사용 한 줄 세션 상태 요약"
    )
    detailed_report: str = Field(
        default="",
        description="AI가 생성한 상세 줄글 리포트"
    )                    # 전체 수업 자동 생성 총평


# ── /end-session API 응답 바디 ────────────────────────────────────────────────
class EndSessionResponse(BaseModel):
    status: str = "ok"
    session_id: str
    student_id: Optional[str] = None
    report: FinalReport


# ── 세션 전체 학생 리포트 데이터 구조 ────────────────────────────────────────
class SessionAggregateReport(BaseModel):
    class_summary: str = Field(
        default="",
        description="반 전체 상태 요약"
    )
    key_questions: list[str] = Field(
        default_factory=list,
        description="주요 질문 문장들"
    )
    weak_concepts_top5: list[str] = Field(
        default_factory=list,
        description="취약개념 TOP 5"
    )


class SessionReportResponse(BaseModel):
    status: str = "ok"
    session_id: Optional[str] = None
    report: SessionAggregateReport
