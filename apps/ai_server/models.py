"""
models.py — FastAPI 요청/응답 데이터 구조 정의
JS의 studentProfile, conversationHistory 구조를 파이썬 타입으로 변환합니다.
"""
from pydantic import BaseModel
from typing import Optional, List, Dict


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


# ── /chat 및 /analyze API 요청 바디 ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    conversation_history: List[ConversationTurn]
    student_profile: Optional[StudentProfile] = None
    # 아래 두 필드는 /analyze 엔드포인트에서 백엔드 콜백 전송에 사용됩니다.
    # NestJS가 호출할 때 함께 전달하면 분석 완료 후 자동으로 콜백이 발송됩니다.
    session_id: Optional[int] = None    # 수업 세션 ID (dialogs 테이블 조회용)
    student_id: Optional[str] = None    # 학생 UUID (dialogs 테이블 조회용)


# ── TEACHER_SUMMARY 파싱 결과 (LLM이 매 턴 생성하는 원천 데이터) ────────────
class TeacherSummary(BaseModel):
    # ── 핵심 분석 지표 (기존 10개 + 신규) ─────────────────────────────────────────
    struggle_level: Optional[int] = 10             # 현재 학습 난항 절대 수치 (0~100). 대시보드 표시용.
    struggle_delta: Optional[int] = None           # 이번 턴 좌절 증감분. unobservable이면 null.
    understanding_score: Optional[int] = 5         # 현재 이해 수준 (1~10)
    current_topic: Optional[str] = None            # 이번 턴 세부 개념 (topicHints 중 선택)
    student_emotion: Optional[str] = None          # 감정: 집중|혼란|좌절|흥미|무반응|불안
    question_intent: Optional[str] = None          # 발화 의도: 개념질문|풀이요청|확인요청|포기표현|잡담|시험답요구
    confusion_type: Optional[str] = None           # 혼란 유형: 개념_모름|적용_실패|오개념|풀이_막힘|없음
    knowledge_gap: Optional[str] = None            # 학생이 정확히 무엇을 모르는지 구체적 요약
    misconception_tag: Optional[str] = None        # 오개념 태그 (misconceptionTagHints 중 선택, 없으면 null)
    engagement_level: Optional[str] = None         # 학습 참여도: 낮음|보통|높음|이탈위험
    one_line_summary: Optional[str] = None         # 교사용 최신 학생 상태 한 줄 요약

    # ── 신뢰도 / 관측 가능성 메타데이터 ──────────────────────────────────────────
    is_observable: Optional[bool] = True           # 이번 발화로 감정/상태 측정이 가능한가
    confidence: Optional[str] = "medium"           # 분석 신뢰도: high | medium | low
    needs_followup_check: Optional[bool] = False   # 다음 턴 확인 필요 여부
    evidence_type: Optional[str] = None            # 판단 근거 유형 (예: giving_up, understanding_confirmed, ambiguous_short)
    reason: Optional[str] = None                   # unobservable 또는 판단 불가 시 사유


# ── /update-realtime API 요청 바디 ────────────────────────────────────────────
class UpdateRealtimeRequest(BaseModel):
    session_id: int
    student_id: str
    analysis: TeacherSummary




# ── /end-session API 요청 바디 ────────────────────────────────────────────────
class EndSessionRequest(BaseModel):
    session_id: int                                    # 세션 고유 ID (NestJS DB의 sessions.id)
    student_id: Optional[str] = None                  # 학생 UUID (dialogs 테이블 조회용)
    summaries: Optional[List[TeacherSummary]] = None  # (선택) 프론트가 직접 전달 시 사용. 없으면 DB에서 자동 조회.
    student_profile: Optional[StudentProfile] = None  # 학생 프로파일 (선택)


# ── 최종 리포트 데이터 구조 ───────────────────────────────────────────────────
class FinalReport(BaseModel):
    session_id: str
    student_id: Optional[str] = None
    total_turns: int                              # 총 대화 턴 수

    # ── 이해도 ─────────────────────────────────────────────────────────────────
    avg_understanding_score: float                # 전체 평균 이해도 (1~10, 수업 회고용)
    peak_understanding_score: int = 0             # 수업 중 최고 이해도 점수 (1~10, 학생이 도달한 최정점)
    recent_avg_understanding_pct: float           # 최근 3턴 평균 이해도 % (×10, 현재 상태용)
    final_understanding_score: int                # 마지막 턴 이해도 점수 (1~10)
    understanding_scores_timeline: List[int]      # 턴별 이해도 % 시계열 (×10, 꺾은선 차트용)

    # ── 좌절 / 안정도 ──────────────────────────────────────────────────────────
    struggle_total: int                        # 누적 좌절 지수 (struggle_delta 합산)
    struggle_trend: str                        # 최근 3턴 좌절 추이: "improving" | "worsening" | "stable"
    stability_gauge: int                          # 안정도 게이지 (0~100, 높을수록 안정)
    urgency_level: int                            # 긴급도 (0~5, struggle_total ÷ 20)

    # ── 감정 / 오개념 ──────────────────────────────────────────────────────────
    dominant_emotion: Optional[str] = None        # 수업 전체 주요 감정 (전체 최빈값, 최종 요약용)
    emotion_trend: Optional[str] = None           # 감정 흐름 (전반부 → 후반부, 예: "혼란 → 집중")
    misconception_tags: List[str] = []            # 감지된 오개념 태그 목록 (중복 제거)
    hallucination_risk_count: int = 0             # 환각 위험 감지 횟수

    # ── 학습 패턴 ──────────────────────────────────────────────────────────────
    learning_mode_distribution: Dict[str, int] = {}   # 학습 모드 분포 {"active": 3, "passive": 5}
    active_ratio: float = 0.0                    # 능동 참여율 % (active + self_correct 회)
    one_line_summaries: List[str] = []            # 턴별 한 줄 요약 목록

    # ── 총평 ───────────────────────────────────────────────────────────────────
    overall_summary: str = ""                     # 전체 수업 자동 생성 총평


# ── /end-session API 응답 바디 ────────────────────────────────────────────────
class EndSessionResponse(BaseModel):
    status: str = "ok"
    session_id: str
    report: FinalReport
    report_url: str = ""      # Supabase Storage 업로드 URL (실패 시 빈 문자열)

