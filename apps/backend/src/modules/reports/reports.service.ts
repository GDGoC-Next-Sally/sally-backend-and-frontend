import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { PrismaService } from '../../providers/prisma/prisma.service';
import axios from 'axios';
import { validateSessionOwner } from '../../common/utils/validate-session-owner';

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


  // 세션 종료 시 AI 서버에 학생별 최종 리포트 생성을 요청합니다. (기존 리포트 초기화 후 재생성)
  async requestStudentFinalReports(sessionId: number, teacherId: string): Promise<void> {
    await validateSessionOwner(this.prisma, sessionId, teacherId);

    // 1. 기존 리포트 삭제 및 분석 상태 리셋
    await this.prisma.$transaction([
      this.prisma.student_reports.deleteMany({ where: { session_id: sessionId } }),
      this.prisma.dialogs.updateMany({
        where: { session_id: sessionId },
        data: { is_analyzed: false }
      })
    ]);

    // 2. 모든 대상 대화 조회 (이제 모두 is_analyzed가 false임)
    const dialogs = await this.prisma.dialogs.findMany({
      where: { session_id: sessionId },
      select: { student_id: true },
    });

    if (dialogs.length === 0) {
      this.logger.log(`세션 ${sessionId}에 생성할 대상이 없습니다.`);
      return;
    }

    // 3. AI 서버에 각각 요청
    dialogs.forEach((dialog) => {
      axios.post(`${AI_SERVER_URL}/api/end-session`, {
        session_id: sessionId,
        student_id: dialog.student_id,
      }).catch(err => {
        this.logger.error(`세션 ${sessionId} 학생 ${dialog.student_id} 리포트 요청 실패: ${err.message}`);
      });
    });

    this.logger.log(`세션 ${sessionId}의 학생 ${dialogs.length}명에 대한 리포트 재생성을 요청했습니다.`);
  }

  // 특정 학생 한 명에 대한 리포트 재생성 요청
  async requestOneStudentFinalReport(sessionId: number, studentId: string, teacherId: string): Promise<void> {
    await validateSessionOwner(this.prisma, sessionId, teacherId);

    // 1. 기존 해당 학생 리포트 삭제 및 분석 상태 리셋
    await this.prisma.$transaction([
      this.prisma.student_reports.deleteMany({ 
        where: { session_id: sessionId, student_id: studentId } 
      }),
      this.prisma.dialogs.updateMany({
        where: { session_id: sessionId, student_id: studentId },
        data: { is_analyzed: false }
      })
    ]);

    // 2. AI 서버에 요청
    axios.post(`${AI_SERVER_URL}/api/end-session`, {
      session_id: sessionId,
      student_id: studentId,
    }).catch(err => {
      this.logger.error(`세션 ${sessionId} 학생 ${studentId} 리포트 개별 요청 실패: ${err.message}`);
    });

    this.logger.log(`세션 ${sessionId} 학생 ${studentId}의 리포트 재생성을 요청했습니다.`);
  }

  async handleStudentFinalReportCallback(sessionId: number, studentId: string, report: any) {
    try {
      const session = await this.prisma.sessions.findUnique({
        where: { id: sessionId },
        select: { teacher_id: true }
      });
      if (!session) {
        this.logger.error(`세션 ${sessionId}를 찾을 수 없습니다.`);
        return;
      }

      const reportData = {
        session_id: sessionId,
        student_id: studentId,
        report: report,
      };

      this.eventsGateway.sendToUser(studentId, 'final_report_ready', reportData);
      this.eventsGateway.sendToUser(session.teacher_id, 'final_report_ready', reportData);

      this.logger.log(`세션 ${sessionId} 학생 ${studentId} 리포트 콜백 처리 및 알림 전송 완료`);
    } catch (e) {
      this.logger.error(`학생 리포트 콜백 처리 실패: ${e.message}`);
    }
  }

  async requestSessionFinalReport(sessionId: number, teacherId: string) {
    await validateSessionOwner(this.prisma, sessionId, teacherId);

    // 기존 세션 리포트 삭제
    await this.prisma.session_reports.deleteMany({
      where: { session_id: sessionId }
    });

    const dialogs = await this.prisma.dialogs.findMany({
      where: { session_id: sessionId },
      select: { id: true, student_id: true, users: { select: { name: true } } },
    });
    
    try {
      const studentPromises = dialogs.map(async d => {
        const student_id = d.student_id;
        const student_name = d.users.name;
        const chat_messages = await this.prisma.chat_messages.findMany({
          where: {
            dialog_id: d.id,
          },
          select: {
            sender_type: true,
            content: true,
          },
          orderBy: { created_at: 'asc' },
        });

        return { student_id, student_name, chat_messages };
      });

      const studentsData = await Promise.all(studentPromises);

      axios.post(`${AI_SERVER_URL}/api/session-report`, {
        session_id: sessionId,
        students: studentsData
      }).catch(err => {
         this.logger.error(`AI 서버 세션 리포트 요청 실패: ${err.message}`);
      });
      
      this.logger.log(`세션 ${sessionId} 전체 리포트 생성을 AI 서버에 요청했습니다.`);

    } catch (err) {
      this.logger.error(`메시지 조회 실패: ${err.message}`);
    }
  }

  async handleSessionFinalReportCallback(sessionId: number, report: any) {
    try {
      const session = await this.prisma.sessions.findUnique({ 
        where: { id: sessionId }, 
        select: { teacher_id: true } 
      });
      if (!session) {
        this.logger.error(`세션 ${sessionId}를 찾을 수 없습니다.`);
        return;
      }
      this.eventsGateway.sendToUser(session.teacher_id, 'session_report_ready', {
        session_id: sessionId,
        report: report
      });

      this.logger.log(`세션 ${sessionId} 전체 리포트 수신 및 저장 완료`);
    } catch (e) {
      this.logger.error(`세션 ${sessionId} 리포트 콜백 처리 실패: ${e.message}`);
    }
  }
}
