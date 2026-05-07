import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { PrismaService } from '../../providers/prisma/prisma.service';
import axios from 'axios';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * 특정 세션의 모든 학생 리포트를 조회합니다 (선생님용).
   */
  async getStudentReportsBySession(sessionId: number) {
    return this.prisma.student_reports.findMany({
      where: { session_id: sessionId },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * 특정 학생의 특정 세션 리포트를 조회합니다 (학생 본인용).
   */
  async getStudentSessionReport(sessionId: number, studentId: string) {
    const report = await this.prisma.student_reports.findFirst({
      where: {
        session_id: sessionId,
        student_id: studentId
      }
    });

    if (!report) {
      throw new NotFoundException('리포트를 찾을 수 없습니다.');
    }

    return report;
  }

  async getStudentSessionList(studentId: string) {
    const attends = await this.prisma.attends.findMany({
      where: { student_id: studentId },
      select: {
        session_id: true,
        sessions: {
          select: {
            session_name: true,
            finished_at: true,
            users: { select: { name: true } }, // 선생님
            classes: { select: { subject: true } } // 과목
          }
        },
      },
      orderBy: { sessions: { finished_at: 'desc' } } // 최신 종료순 정렬
    });
  
    // 프론트엔드가 쓰기 편하게 평탄화(Flattening)
    return attends.map(item => ({
      sessionId: item.session_id,
      sessionName: item.sessions.session_name,
      finishedAt: item.sessions.finished_at,
      teacherName: item.sessions.users.name,
      subject: item.sessions.classes.subject,
    }));
  }

  /**
   * 특정 세션의 전체 요약 리포트를 조회합니다.
   */
  async getSessionReport(sessionId: number) {
    return this.prisma.session_reports.findUnique({
      where: { session_id: sessionId }
    });
  }

  /**
   * 특정 클래스의 전체 통계 리포트를 조회합니다.
   */
  async getClassReport(classId: number) {
    return this.prisma.class_reports.findUnique({
      where: { class_id: classId }
    });
  }

  /**
   * 세션 종료 시 AI 서버에 학생별 최종 리포트 생성을 요청합니다.
   *
   * @param sessionId - 세션 ID
   * @param dialogs - 세션에 속한 다이얼로그 목록 (student_id, real_time_analysis 포함)
   * @param sessionInfo - 세션/클래스 정보 (student_profile 구성용)
   */
  async requestFinalReports(
    sessionId: number,
    teacherId: string,
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
          { timeout: 180000 },
        );

        // 실시간 알림 전송 (학생 & 선생님)
        const reportData = {
          session_id: sessionId,
          student_id: dialog.student_id,
          report: response.data.report,
        };

        // 1. 학생에게 알림
        this.eventsGateway.sendToUser(dialog.student_id, 'final_report_ready', reportData);
        // 2. 선생님에게 알림
        this.eventsGateway.sendToUser(teacherId, 'final_report_ready', reportData);

        this.logger.log(
          `세션 ${sessionId}에서 학생 ${dialog.student_id}의 최종 리포트가 생성되었습니다.`,
        );
      } catch (err) {
        // 한 학생 실패해도 나머지는 계속 처리
        this.logger.error(
          `세션 ${sessionId}에서 학생 ${dialog.student_id}의 리포트 생성 실패: ${err.message}`,
        );
      }
    });

    await Promise.allSettled(tasks);
    this.logger.log(`세션 ${sessionId}에 대한 모든 최종 리포트 생성을 요청했습니다.`);
  }
}
