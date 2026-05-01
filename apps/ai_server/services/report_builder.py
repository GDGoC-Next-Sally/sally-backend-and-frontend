"""
services/report_builder.py — 최종 수업 리포트 생성 서비스
대화 종료 시 누적된 TeacherSummary 목록을 분석하여 FinalReport를 생성합니다.

설계 원칙:
- frustration_trend: 최근 3턴의 방향성으로 판단 (실시간성 + 설계 스펙)
- avg_understanding_score: 수업 전체 평균 (회고용)
- recent_avg_understanding_pct: 최근 3턴 × 10 (현재 상태 파악용)
- understanding_scores_timeline: 전체 턴 × 10 (꺾은선 차트용)
- dominant_emotion: 수업 전체 최빈값 (최종 리포트 요약용, 실시간 지표는 NestJS가 처리)
- stability_gauge / urgency_level: frustration_total 기반 대시보드 게이지
"""
from collections import Counter
from typing import List, Optional

from ai_server.models import TeacherSummary, FinalReport

# 긴급 개입 기준값 (frustration_total ≥ 이 값이면 긴급도 최대)
URGENCY_MAX_THRESHOLD = 100


def generate_final_report(
    session_id: str,
    summaries: List[TeacherSummary],
    student_id: Optional[str] = None,
) -> FinalReport:
    """
    누적된 teacher_summary 목록을 분석하여 최종 리포트를 생성합니다.
    """
    total_turns = len(summaries)

    if total_turns == 0:
        return FinalReport(
            session_id=session_id,
            student_id=student_id,
            total_turns=0,
            avg_understanding_score=0.0,
            recent_avg_understanding_pct=0.0,
            final_understanding_score=0,
            understanding_scores_timeline=[],
            frustration_total=0,
            frustration_trend="stable",
            stability_gauge=100,
            urgency_level=0,
            hallucination_risk_count=0,
            overall_summary="대화 기록이 없습니다.",
        )

    # ── 이해도 분석 ───────────────────────────────────────────────────────────
    understanding_scores = [
        s.understanding_score for s in summaries if s.understanding_score is not None
    ]

    # 전체 평균 (1~10 원점수, 수업 회고용)
    avg_understanding_score = (
        round(sum(understanding_scores) / len(understanding_scores), 1)
        if understanding_scores else 0.0
    )

    # 최근 3턴 평균 × 10 (0~100%, 대시보드 현재 상태 표시용)
    recent_scores = understanding_scores[-3:] if len(understanding_scores) >= 3 else understanding_scores
    recent_avg_understanding_pct = (
        round(sum(recent_scores) / len(recent_scores) * 10, 1)
        if recent_scores else 0.0
    )

    # 마지막 턴 이해도
    final_understanding_score = understanding_scores[-1] if understanding_scores else 0

    # 전체 턴별 이해도 % 시계열 (꺾은선 차트용)
    understanding_scores_timeline = [s * 10 for s in understanding_scores]

    # ── 좌절 지수 분석 ────────────────────────────────────────────────────────
    frustration_deltas = [
        s.frustration_delta for s in summaries if s.frustration_delta is not None
    ]
    frustration_total = sum(frustration_deltas)

    # 최근 3턴 방향성으로 추이 판단 (설계 스펙 준수)
    recent_deltas = frustration_deltas[-3:] if len(frustration_deltas) >= 3 else frustration_deltas
    recent_sum = sum(recent_deltas)
    if recent_sum < 0:
        frustration_trend = "improving"   # 최근 3턴 합산 음수 → 호전 중
    elif recent_sum > 0:
        frustration_trend = "worsening"   # 최근 3턴 합산 양수 → 악화 중
    else:
        frustration_trend = "stable"      # 변화 없음

    # 안정도 게이지 (0~100, 높을수록 안정)
    stability_gauge = max(0, min(100, 100 - frustration_total))

    # 긴급도 (0~5, frustration_total ÷ 20, 최대 5)
    urgency_level = min(5, max(0, frustration_total // 20))

    # ── 환각 위험 횟수 ────────────────────────────────────────────────────────
    hallucination_risk_count = sum(
        1 for s in summaries if s.is_hallucination_risk is True
    )

    # ── 주요 감정 (전체 최빈값, 최종 리포트 요약용) ───────────────────────────
    # 실시간 "최근 3턴 최빈값"은 NestJS가 스트리밍 데이터로 직접 계산 (역할 분리)
    emotions = [s.student_emotion for s in summaries if s.student_emotion]
    dominant_emotion = Counter(emotions).most_common(1)[0][0] if emotions else None

    # ── 오개념 태그 목록 (중복 제거, 순서 유지) ──────────────────────────────
    seen = set()
    misconception_tags = []
    for s in summaries:
        if s.misconception_tag and s.misconception_tag not in seen:
            seen.add(s.misconception_tag)
            misconception_tags.append(s.misconception_tag)

    # ── 학습 모드 분포 ────────────────────────────────────────────────────────
    learning_modes = [s.learning_mode for s in summaries if s.learning_mode]
    learning_mode_distribution = dict(Counter(learning_modes))

    # ── 턴별 한 줄 요약 목록 ──────────────────────────────────────────────────
    one_line_summaries = [
        s.one_line_summary for s in summaries if s.one_line_summary
    ]

    # ── 전체 수업 총평 자동 생성 ──────────────────────────────────────────────
    overall_summary = _generate_overall_summary(
        total_turns=total_turns,
        avg_understanding_score=avg_understanding_score,
        frustration_trend=frustration_trend,
        frustration_total=frustration_total,
        stability_gauge=stability_gauge,
        dominant_emotion=dominant_emotion,
        misconception_tags=misconception_tags,
    )

    return FinalReport(
        session_id=session_id,
        student_id=student_id,
        total_turns=total_turns,
        avg_understanding_score=avg_understanding_score,
        recent_avg_understanding_pct=recent_avg_understanding_pct,
        final_understanding_score=final_understanding_score,
        understanding_scores_timeline=understanding_scores_timeline,
        frustration_total=frustration_total,
        frustration_trend=frustration_trend,
        stability_gauge=stability_gauge,
        urgency_level=urgency_level,
        hallucination_risk_count=hallucination_risk_count,
        dominant_emotion=dominant_emotion,
        misconception_tags=misconception_tags,
        learning_mode_distribution=learning_mode_distribution,
        one_line_summaries=one_line_summaries,
        overall_summary=overall_summary,
    )


def _generate_overall_summary(
    total_turns: int,
    avg_understanding_score: float,
    frustration_trend: str,
    frustration_total: int,
    stability_gauge: int,
    dominant_emotion: Optional[str],
    misconception_tags: List[str],
) -> str:
    """누적 분석 데이터를 바탕으로 전체 수업 총평 문자열을 자동 생성합니다."""

    trend_str = {
        "improving": "수업 후반으로 갈수록 안정되는 모습을 보였습니다.",
        "worsening": "수업 후반으로 갈수록 어려움이 증가하는 경향이 있었습니다. 추가 지도가 권장됩니다.",
        "stable": "전반적으로 감정 상태가 일관적이었습니다.",
    }.get(frustration_trend, "")

    stability_str = (
        f"안정도는 {stability_gauge}/100점으로 "
        + ("매우 안정적입니다." if stability_gauge >= 70
           else "주의가 필요합니다." if stability_gauge >= 40
           else "긴급 개입이 필요한 수준입니다.")
    )

    misconception_str = (
        f"감지된 오개념: {', '.join(misconception_tags)}." if misconception_tags
        else "특별한 오개념은 감지되지 않았습니다."
    )

    emotion_str = f"주요 감정 상태는 '{dominant_emotion}'이었습니다." if dominant_emotion else ""

    return (
        f"총 {total_turns}턴의 대화가 진행되었습니다. "
        f"전체 평균 이해도는 {avg_understanding_score}/10점입니다. "
        f"{stability_str} {trend_str} {emotion_str} {misconception_str}"
    ).strip()
