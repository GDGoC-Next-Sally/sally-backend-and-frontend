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
- overall_summary: LLM이 직접 생성하는 서술형 종합 평가 (템플릿 방식 폐지)
"""
import os
from collections import Counter
from pathlib import Path
from typing import List, Optional

from openai import AsyncOpenAI
from dotenv import load_dotenv

from ai_server.models import TeacherSummary, FinalReport

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

MODEL = "google/gemma-4-31b-it"

# 긴급 개입 기준값 (frustration_total ≥ 이 값이면 긴급도 최대)
URGENCY_MAX_THRESHOLD = 100


def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise RuntimeError(".env 파일에 NVIDIA_API_KEY가 설정되어 있지 않습니다.")
    return AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key,
    )


async def generate_final_report(
    session_id: str,
    summaries: List[TeacherSummary],
    student_id: Optional[str] = None,
) -> FinalReport:
    """
    누적된 teacher_summary 목록을 분석하여 최종 리포트를 생성합니다.
    overall_summary는 LLM이 직접 서술형 평가를 생성합니다.
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

    # 가중 평균 (1~10 원점수, 후반 턴에 더 높은 가중치 부여 → 수업 말미 주도 이해도 반영)
    if understanding_scores:
        weights = list(range(1, len(understanding_scores) + 1))  # [1, 2, 3, ... n]
        avg_understanding_score = round(
            sum(s * w for s, w in zip(understanding_scores, weights)) / sum(weights), 1
        )
    else:
        avg_understanding_score = 0.0

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
    # 턴당 최대 delta=30 기준으로 동적 산정 (턴 수가 많아도 산정가 차지 않도록)
    max_possible_frustration = max(total_turns * 30, 1)
    stability_gauge = max(0, min(100, round((1 - frustration_total / max_possible_frustration) * 100)))

    # 긴급도 (0~5, 콜수록 즉시 개입 필요)
    # 동일한 동적 스케일 적용
    urgency_level = min(5, max(0, round((frustration_total / max_possible_frustration) * 5)))

    # ── 환각 위험 횟수 ────────────────────────────────────────────────────────
    hallucination_risk_count = sum(
        1 for s in summaries if s.is_hallucination_risk is True
    )

    # ── 최고 이해도 (수업 중 학생이 도달한 최고점) ───────────────────────────
    peak_understanding_score = max(understanding_scores) if understanding_scores else 0

    # ── 주요 감정 + 감정 흐름 ───────────────────────────────────────────────────
    # 실시간 "최근 3턴 최빈값"은 NestJS가 스트리밍 데이터로 직접 계산 (역할 분리)
    emotions = [s.student_emotion for s in summaries if s.student_emotion]
    dominant_emotion = Counter(emotions).most_common(1)[0][0] if emotions else None

    # 감정 흐름: 수업 전반부 vs 후반부 최빈값 비교
    if emotions:
        mid = max(len(emotions) // 2, 1)
        first_half_emotion = Counter(emotions[:mid]).most_common(1)[0][0]
        second_half_emotion = Counter(emotions[mid:]).most_common(1)[0][0] if emotions[mid:] else first_half_emotion
        if first_half_emotion != second_half_emotion:
            emotion_trend = f"{first_half_emotion} → {second_half_emotion}"
        else:
            emotion_trend = f"{dominant_emotion} (수업 내내 일관적)"
    else:
        emotion_trend = None

    # ── 오개념 태그 목록 (중복 제거, 순서 유지) ──────────────────────────────
    seen = set()
    misconception_tags = []
    for s in summaries:
        if s.misconception_tag and s.misconception_tag not in seen:
            seen.add(s.misconception_tag)
            misconception_tags.append(s.misconception_tag)

    # ── 학습 모드 분포 + 능동 참여율 ──────────────────────────────────────────
    learning_modes = [s.learning_mode for s in summaries if s.learning_mode]
    learning_mode_distribution = dict(Counter(learning_modes))
    active_count = learning_mode_distribution.get("active", 0) + learning_mode_distribution.get("self_correct", 0)
    active_ratio = round(active_count / len(learning_modes) * 100, 1) if learning_modes else 0.0

    # ── 턴별 한 줄 요약 목록 ──────────────────────────────────────────────────
    one_line_summaries = [
        s.one_line_summary for s in summaries if s.one_line_summary
    ]

    # ── 전체 수업 총평 자동 생성 ──────────────────────────────────────────────
    overall_summary = await _generate_overall_summary_llm(
        total_turns=total_turns,
        avg_understanding_score=avg_understanding_score,
        peak_understanding_score=peak_understanding_score,
        final_understanding_score=final_understanding_score,
        frustration_trend=frustration_trend,
        frustration_total=frustration_total,
        stability_gauge=stability_gauge,
        dominant_emotion=dominant_emotion,
        emotion_trend=emotion_trend,
        misconception_tags=misconception_tags,
        active_ratio=active_ratio,
        one_line_summaries=one_line_summaries,
    )

    return FinalReport(
        session_id=session_id,
        student_id=student_id,
        total_turns=total_turns,
        avg_understanding_score=avg_understanding_score,
        peak_understanding_score=peak_understanding_score,
        recent_avg_understanding_pct=recent_avg_understanding_pct,
        final_understanding_score=final_understanding_score,
        understanding_scores_timeline=understanding_scores_timeline,
        frustration_total=frustration_total,
        frustration_trend=frustration_trend,
        stability_gauge=stability_gauge,
        urgency_level=urgency_level,
        hallucination_risk_count=hallucination_risk_count,
        dominant_emotion=dominant_emotion,
        emotion_trend=emotion_trend,
        misconception_tags=misconception_tags,
        learning_mode_distribution=learning_mode_distribution,
        active_ratio=active_ratio,
        one_line_summaries=one_line_summaries,
        overall_summary=overall_summary,
    )


async def _generate_overall_summary_llm(
    total_turns: int,
    avg_understanding_score: float,
    peak_understanding_score: int,
    final_understanding_score: int,
    frustration_trend: str,
    frustration_total: int,
    stability_gauge: int,
    dominant_emotion: Optional[str],
    emotion_trend: Optional[str],
    misconception_tags: List[str],
    active_ratio: float,
    one_line_summaries: List[str],
) -> str:
    """
    LLM을 통해 수업 종합 평가를 서술형으로 생성합니다.
    """
    # 턴별 한 줄 요약을 번호와 함께 정리
    summaries_text = "\n".join(
        f"  {i+1}턴: {s}" for i, s in enumerate(one_line_summaries)
    ) if one_line_summaries else "  (요약 없음)"

    trend_label = {
        "improving": "호전(수업 후반 안정됨)",
        "worsening": "악화(수업 후반 어려움 증가)",
        "stable": "안정(큰 변화 없음)",
    }.get(frustration_trend, "")

    misconception_text = ", ".join(misconception_tags) if misconception_tags else "없음"

    prompt = (
        "당신은 교육 전문가이자 AI 튜터 분석 시스템입니다.\n"
        "아래는 학생 한 명의 오늘 수업 데이터입니다. "
        "이 데이터를 바탕으로 담임선생님이 읽을 수 있는 수준의 종합 평가 코멘트를 작성하세요.\n\n"
        "[규칙]\n"
        "- 숫자 지표를 단순 나열하지 마십시오.\n"
        "- 학생의 학습 태도, 감정 흐름, 이해도 변화를 종합하여 선생님이 다음 수업에 활용할 수 있는 인사이트를 서술하십시오.\n"
        "- 한국어로, 3~5문장 분량의 자연스러운 단락으로 작성하십시오.\n"
        "- 학생을 직접 지칭하지 말고 '이 학생'으로 표현하십시오.\n\n"
        "[수업 데이터]\n"
        f"- 총 대화 턴 수: {total_turns}턴\n"
        f"- 가중 평균 이해도: {avg_understanding_score}/10점 | 최고 이해도: {peak_understanding_score}/10점 | 마지막 턴 이해도: {final_understanding_score}/10점\n"
        f"- 좌절 추이: {trend_label} (누적 좌절 지수: {frustration_total}, 안정도: {stability_gauge}/100)\n"
        f"- 감정 흐름: {emotion_trend or dominant_emotion or '미확인'}\n"
        f"- 능동 참여율: {active_ratio}%\n"
        f"- 감지된 오개념: {misconception_text}\n"
        f"- 턴별 한 줄 요약:\n{summaries_text}\n\n"
        "위 내용을 바탕으로 종합 평가 코멘트를 작성하십시오."
    )

    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # LLM 호출 실패 시 기존 템플릿 방식으로 폴백
        print(f"[WARN] overall_summary LLM 생성 실패, 폴백 사용: {e}")
        trend_str = {
            "improving": "수업 후반으로 갈수록 안정되는 모습을 보였습니다.",
            "worsening": "수업 후반으로 갈수록 어려움이 증가하는 경향이 있었습니다.",
            "stable": "전반적으로 감정 상태가 일관적이었습니다.",
        }.get(frustration_trend, "")
        return (
            f"총 {total_turns}턴의 대화가 진행되었습니다. "
            f"전체 평균 이해도 {avg_understanding_score}/10점, 최고 이해도 {peak_understanding_score}/10점. "
            f"{trend_str}"
        ).strip()

