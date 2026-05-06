import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { SendInterventionDto } from './dto/send-intervention.dto';
import { LivechatService } from '../livechat/livechat.service';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly livechatService: LivechatService,
  ) { }

  async sendIntervention(teacherId: string, dto: SendInterventionDto) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dto.dialog_id },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('대화를 찾을 수 없습니다.');
    if (dialog.sessions.teacher_id !== teacherId) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    // 1. 선생님의 개입 메시지 DB 저장
    const interventionMessage = await this.prisma.chat_messages.create({
      data: {
        dialog_id: dialog.id,
        sender_type: 'TEACHER',
        content: dto.content
      }
    });

    // 2. 학생에게 소켓으로 전송
    this.eventsGateway.sendToUser(dialog.student_id, 'teacher_intervention', {
      ...interventionMessage,
      type: dto.type || 'ADVICE'
    });

    return interventionMessage;
  }

  async getStudents(teacherId: string, sessionId: number) {
    const dialogs = await this.prisma.dialogs.findMany({
      where: {
        session_id: sessionId,
        sessions: {
          teacher_id: teacherId
        }
      },
      include: {
        users: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return dialogs.map(d => ({
      dialogId: d.id,
      studentId: d.student_id,
      name: d.users.name,
      latestAnalysis: Array.isArray(d.real_time_analysis) && d.real_time_analysis.length > 0
        ? d.real_time_analysis[d.real_time_analysis.length - 1]
        : null
    }));
  }

  async getStudentDetail(teacherId: string, dialogId: number) {
    // 1. 기존 라이브챗 서비스 호출 (여기서 존재 여부 및 권한 체크가 모두 수행됨)
    const messages = await this.livechatService.getMessages(dialogId, teacherId, 'TEACHER');

    // 2. 분석 내역을 가져오기 위해 필요한 정보만 조회
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dialogId },
      select: { student_id: true, real_time_analysis: true }
    });

    if (!dialog) throw new NotFoundException('대화를 찾을 수 없습니다.');

    return {
      dialogId,
      studentId: dialog.student_id,
      messages: messages,
      analysisHistory: Array.isArray(dialog.real_time_analysis) ? dialog.real_time_analysis : []
    };
  }

  async sendGlobalAnnouncement(teacherId: string, sessionId: number, content: string) {
    // 1. 세션 존재 및 권한 확인
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId }
    });
    if (!session) throw new NotFoundException('세션을 찾을 수 없습니다.');
    if (session.teacher_id !== teacherId) throw new UnauthorizedException('권한이 없습니다.');

    // 2. 세션에 속한 모든 다이얼로그 조회
    const dialogs = await this.prisma.dialogs.findMany({
      where: { session_id: sessionId }
    });

    // 3. 모든 다이얼로그에 공지 메시지 저장 (벌크 생성은 Prisma에서 관계 때문에 복잡하므로 map으로 처리)
    const announcementTasks = dialogs.map(dialog => 
      this.prisma.chat_messages.create({
        data: {
          dialog_id: dialog.id,
          sender_type: 'TEACHER',
          content: content,
          is_global: true
        }
      })
    );
    await Promise.all(announcementTasks);

    // 4. 소켓으로 해당 세션 전체에 브로드캐스트
    this.eventsGateway.sendToRoom(`session:${sessionId}`, 'global_announcement', {
      sender_type: 'TEACHER',
      content: content,
      created_at: new Date()
    });

    return { success: true, count: dialogs.length };
  }
}
