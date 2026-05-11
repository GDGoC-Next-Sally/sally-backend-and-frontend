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
  ) { }

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

  // 특정 학생이 참여한 지난 세션 목록 조회 (classId 필터 선택 가능)
  async getStudentSessionList(studentId: string, classId?: number) {
    const attends = await this.prisma.attends.findMany({
      where: {
        student_id: studentId,
        sessions: {
          finished_at: { not: null }, // finished_at이 null이 아닌 데이터만 조회
          ...(classId && { class_id: classId }) // classId가 있으면 해당 클래스만 필터링
        }
      },
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


  // 세션 종료 시 AI 서버에 학생별 최종 리포트 생성을 요청합니다.
  async requestFinalReports(sessionId: number, teacherId: string, dialogs: { student_id: string; }[],): Promise<void> {
    // 학생별로 개별 요청 (병렬 처리)
    const tasks = dialogs.map(async (dialog) => {
      try {
        const response = await axios.post(
          `${AI_SERVER_URL}/api/end-session`,
          {
            session_id: sessionId,
            student_id: dialog.student_id,
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
