import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { Observable, Subject } from 'rxjs';
import axios from 'axios';

const AI_SERVER_URL = process.env.AI_SERVER_URL || 'http://localhost:8000';

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

    if (!dialog) throw new NotFoundException('대화를 찾을 수 없습니다.');

    // 권한 확인: 본인, 해당 클래스 선생님, 혹은 관리자
    if (role !== 'ADMIN' && dialog.student_id !== userId && dialog.sessions.teacher_id !== userId) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    return this.prisma.chat_messages.findMany({
      where: { dialog_id: dialogId },
      orderBy: { created_at: 'asc' }
    });
  }

  // 학생 전용 메시지 전송
  async sendMessage(studentId: string, dto: SendChatMessageDto) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dto.dialog_id }, 
      include: { 
        sessions: {
          include: { classes: true }
        }
      }
    });

    if (!dialog || dialog.student_id !== studentId) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    if (dialog.sessions.status === 'FINISHED') {
      throw new ForbiddenException('이미 종료된 세션입니다.');
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
    };
  }

  getAiResponseStream(studentId: string, dto: SendChatMessageDto): Observable<any> {
    return new Observable((subscriber) => {
      this.sendMessage(studentId, dto).then(async ({ userMessage, dialog}) => {
        try {
          // 1. 과거 대화 내역 조회 (AI 서버용 conversation_history 구성)
          const pastMessages = await this.prisma.chat_messages.findMany({
            where: { dialog_id: dialog.id },
            orderBy: { created_at: 'asc' },
          });

          const conversation_history = pastMessages
            .filter(msg => msg.sender_type !== 'TEACHER')
            .map(msg => ({
              role: msg.sender_type === 'AI' ? 'model' : 'user',
              text: msg.content
            }));

          // 선생님의 개입 메시지(TEACHER)를 시간순으로 topic_hints에 반영
          const teacherHints = pastMessages
            .filter(msg => msg.sender_type === 'TEACHER')
            .map(msg => msg.content);

          // 2. 학생 프로필(수업 컨텍스트) 구성
          const student_profile = {
            subject: dialog.sessions.classes.subject,
            scope: dialog.sessions.session_name,
            learning_objectives: dialog.sessions.objective || "미설정",
            key_concepts: dialog.sessions.explanation || "미설정",
            topic_hints: teacherHints,  // 선생님 개입 내용을 AI 힌트로 제공
          };

          // 3. AI 서버 스트리밍 요청
          const response = await axios.post(`${AI_SERVER_URL}/api/chat`, {
            conversation_history,
            student_profile
          }, { responseType: 'stream' });

          let aiFullContent = '';

          response.data.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            aiFullContent += text;
            subscriber.next({ data: { chunk: text } });
          });

          response.data.on('end', async () => {
            // AI 메시지 저장 및 선생님 알림
            await this.saveAiMessage(dialog.id, aiFullContent.trim(), dialog.sessions.teacher_id);
            subscriber.complete();

            // 4. 답변 완료 후 백그라운드 분석 요청 (비동기)
            this.requestAiAnalysis(conversation_history, student_profile, dialog.id, aiFullContent.trim());
          });

          response.data.on('error', (err: Error) => {
            subscriber.error(err);
          });

        } catch (err) {
          subscriber.error(err);
        }
      }).catch(err => {
        subscriber.error(err);
      });
    });
  }

  /**
   * AI 서버에 분석 요청을 보내고 즉시 반환합니다 (Fire and Forget).
   * 분석 완료 후 FastAPI가 /livechat/analytics-callback으로 직접 결과를 POST합니다.
   */
  private requestAiAnalysis(history: any[], profile: any, dialogId: number, aiResponse: string) {
    const updatedHistory = [...history, { role: 'model', text: aiResponse }];
    const callbackUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/livechat/analytics-callback`;

    // 결과를 기다리지 않고 즉시 반환 (FastAPI가 완료 후 콜백으로 알려줌)
    axios.post(`${AI_SERVER_URL}/api/analyze`, {
      conversation_history: updatedHistory,
      student_profile: profile,
      dialog_id: dialogId,
      callback_url: callbackUrl
    }, { timeout: 60000 }).catch(err => {
      console.error('AI Analysis request failed:', err.message);
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

  async handleAnalytics(dialogId: number, analysis: any) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dialogId },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('대화를 찾을 수 없습니다.');

    // 1. 기존 누적 배열에 새 분석 결과 추가 (없으면 빈 배열로 시작)
    const existing = Array.isArray(dialog.real_time_analysis)
      ? dialog.real_time_analysis
      : [];
    const updatedSummaries = [...existing, analysis];

    const updatedDialog = await this.prisma.dialogs.update({
      where: { id: dialogId },
      data: {
        real_time_analysis: updatedSummaries as any
      }
    });

    // 2. 선생님에게는 최신 분석 결과 1건만 소켓으로 발송
    this.eventsGateway.sendToUser(dialog.sessions.teacher_id, 'student_analysis_ready', {
      dialog_id: dialogId,
      analysis: analysis  // 최신 것만 전송 (대시보드 갱신용)
    });

    return updatedDialog;
  }
}
