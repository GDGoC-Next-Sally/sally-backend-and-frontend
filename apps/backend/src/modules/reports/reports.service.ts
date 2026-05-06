import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  /**
   * 세션 종료 시 AI 서버에 학생별 최종 리포트 생성을 요청합니다.
   *
   * @param sessionId - 세션 ID
   * @param dialogs - 세션에 속한 다이얼로그 목록 (student_id, real_time_analysis 포함)
   * @param sessionInfo - 세션/클래스 정보 (student_profile 구성용)
   */
  async requestFinalReports(
    sessionId: number,
    dialogs: { student_id: string; real_time_analysis: any }[],
    sessionInfo: { session_name: string; objective?: string | null; explanation?: string | null; classes?: { subject: string } | null },
  ): Promise<void> {
    const student_profile = {
      subject: sessionInfo.classes?.subject || '미설정',
      scope: sessionInfo.session_name,
      learning_objectives: sessionInfo.objective || '미설정',
      key_concepts: sessionInfo.explanation || '미설정',
    };

    // 학생별로 개별 요청 (병렬 처리)
    const tasks = dialogs.map(async (dialog) => {
      try {
        // real_time_analysis가 없는 학생(대화 없음)은 건너뜀
        if (!dialog.real_time_analysis) {
          this.logger.warn(`학생 ${dialog.student_id}에 대한 분석 데이터가 없습니다. 건너뜁니다.`);
          return;
        }

        // real_time_analysis는 TeacherSummary 한 건일 수도 있고 배열일 수도 있음
        const summaries = Array.isArray(dialog.real_time_analysis)
          ? dialog.real_time_analysis
          : [dialog.real_time_analysis];

        const response = await axios.post(
          `${AI_SERVER_URL}/api/end-session`,
          {
            session_id: sessionId,
            student_id: dialog.student_id,
            summaries,
            student_profile,
          },
          { timeout: 180000 }, // 리포트 생성은 최대 3분
        );

        this.logger.log(
          `세션 ${sessionId}에서 학생 ${dialog.student_id}의 최종 리포트가 생성되었습니다. 상태: ${response.data.status}`,
        );
      } catch (err) {
        // 한 학생 실패해도 나머지는 계속 처리
        this.logger.error(
          `세션 ${sessionId}에서 학생 ${dialog.student_id}의 리포트를 생성하는 데 실패했습니다: ${err.message}`,
        );
      }
    });

    await Promise.allSettled(tasks);
    this.logger.log(`세션 ${sessionId}에 대한 모든 최종 리포트 생성을 요청했습니다.`);
  }
}
