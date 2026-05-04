import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { SendInterventionDto } from './dto/send-intervention.dto';
import { Observable } from 'rxjs';

@Injectable()
export class LivechatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getMessages(dialogId: number, userId: string, role: string) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dialogId },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('Dialog not found');

    // 권한 확인: 본인, 해당 클래스 선생님, 혹은 관리자
    if (role !== 'ADMIN' && dialog.student_id !== userId && dialog.sessions.teacher_id !== userId) {
      throw new UnauthorizedException('Access denied');
    }

    return this.prisma.chat_messages.findMany({
      where: { dialog_id: dialogId },
      orderBy: { created_at: 'asc' }
    });
  }

  async sendIntervention(teacherId: string, dto: SendInterventionDto) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dto.dialog_id },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('Dialog not found');
    if (dialog.sessions.teacher_id !== teacherId) {
      throw new UnauthorizedException('Only the teacher can send an intervention');
    }

    // 1. 선생님의 개입 메시지도 기록으로 남김
    const interventionMessage = await this.prisma.chat_messages.create({
      data: {
        dialog_id: dialog.id,
        sender_type: 'TEACHER',
        content: dto.content,
      }
    });

    // 2. 학생에게 소켓으로 전송 (프론트는 type이 AI_GUIDANCE일 때만 다음 메시지에 첨부)
    this.eventsGateway.sendToUser(dialog.student_id, 'teacher_intervention', {
      ...interventionMessage,
      type: dto.type || 'ADVICE'
    });

    return interventionMessage;
  }

  // 학생 전용 메시지 전송
  async sendMessage(studentId: string, dto: SendChatMessageDto) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dto.dialog_id }, 
      include: { sessions: true }
    });

    if (!dialog || dialog.student_id !== studentId) {
      throw new UnauthorizedException('You are not a participant in this dialog');
    }

    // 1. 학생 메시지 저장
    const userMessage = await this.prisma.chat_messages.create({
      data: {
        dialog_id: dialog.id,
        sender_type: 'STUDENT',
        content: dto.content,
      }
    });

    // 2. 선생님에게 실시간 발송 (해당 학생이 메시지를 보냈음을 알림)
    this.eventsGateway.sendToUser(dialog.sessions.teacher_id, 'student_message', userMessage);

    return {
      userMessage,
      dialog,
      intervention: dto.intervention
    };
  }

  // AI 응답 스트림 생성
  getAiResponseStream(studentId: string, dto: SendChatMessageDto): Observable<any> {
    return new Observable((subscriber) => {
      this.sendMessage(studentId, dto).then(async ({ userMessage, dialog, intervention }) => {
        
        // TODO: 실제 AI 서버 연동 로직
        const mockResponse = `(AI 서버 스트리밍 중...) 방금 학생이 보낸 메시지: "${userMessage.content}"\n${intervention ? `[선생님 가이드 반영: ${intervention}]` : ''}\n좋은 질문이에요! 계속 이야기해볼까요?`;
        
        const chunks = mockResponse.split(' ');
        let aiFullContent = '';

        for (let i = 0; i < chunks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          const chunk = chunks[i] + ' ';
          aiFullContent += chunk;
          
          subscriber.next({ data: { chunk } });
        }

        // 전송 완료 후 저장 및 알림
        await this.saveAiMessage(dialog.id, aiFullContent.trim(), dialog.sessions.teacher_id);
        subscriber.complete();

      }).catch(err => {
        subscriber.error(err);
      });
    });
  }

  async saveAiMessage(dialogId: number, content: string, teacherId: string) {
    const aiMessage = await this.prisma.chat_messages.create({
      data: {
        dialog_id: dialogId,
        sender_type: 'AI',
        content,
      }
    });

    // 선생님에게 완료된 AI 메시지 소켓으로 전달
    this.eventsGateway.sendToUser(teacherId, 'ai_message', aiMessage);
    return aiMessage;
  }

  async handleAnalyticsCallback(dialogId: number, analysis: any) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dialogId },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('Dialog not found');

    // 1. 분석 결과 저장
    const updatedDialog = await this.prisma.dialogs.update({
      where: { id: dialogId },
      data: { 
        real_time_analysis: analysis as any
      }
    });

    // 2. 선생님에게 실시간 분석 결과 발송
    this.eventsGateway.sendToUser(dialog.sessions.teacher_id, 'student_analysis_ready', {
      dialog_id: dialogId,
      analysis: analysis
    });

    return updatedDialog;
  }
}
