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


# ── TEACHER_SUMMARY 파싱 결과 (LLM이 매 턴 생성하는 원천 데이터 12개) ────────
class TeacherSummary(BaseModel):
    frustration_delta: Optional[int] = 0          # 이번 턴 좌절 증감분 (-30~+30)
    student_understood: Optional[bool] = True     # 이번 턴 개념 이해 여부
    understanding_score: Optional[int] = 5        # 현재 이해 수준 (0~10)
    current_topic: Optional[str] = None           # 이번 턴 세부 개념 (topicHints 중 선택)
    student_emotion: Optional[str] = None         # 감정: 집중|혼란|좌절|자신감|지루함|불안|호기심|성취감|당황
    internal_reasoning: Optional[str] = None      # AI 판단 근거 한 줄
    one_line_summary: Optional[str] = None        # 교사 기록용 한 줄 요약 (20자 이내)
    question_intent: Optional[str] = None         # 발화 의도: 개념질문|확인요청|풀이요청|감정표현|포기표현|잡담|시험답요구|기타
    confusion_type: Optional[str] = None          # 혼란 유형: 개념_모름|선행지식_부족|용어_혼란|풀이_막힘|적용_어려움|오개념|없음
    misconception_tag: Optional[str] = None       # 오개념 태그 (없으면 null)
    learning_mode: Optional[str] = None           # 학습 태도: active|passive|self_correct
    repetition_detected: Optional[bool] = False   # 학생이 이전 질문을 반복하는지 여부 (설명 미이해 신호)
    intervention_needed: Optional[bool] = False   # 선생님 즉각 개입 필요 여부 (좌절/포기 등)
    suggested_next_action: Optional[str] = None   # AI 다음 행동: 기초_재설명|심화_진행|감정_수용|범위_복귀|이해_확인|예시_제공


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
    frustration_total: int                        # 누적 좌절 지수 (frustration_delta 합산)
    frustration_trend: str                        # 최근 3턴 좌절 추이: "improving" | "worsening" | "stable"
    stability_gauge: int                          # 안정도 게이지 (0~100, 높을수록 안정)
    urgency_level: int                            # 긴급도 (0~5, frustration_total ÷ 20)

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

