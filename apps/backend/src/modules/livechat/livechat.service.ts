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
  ) { }

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
      dialog,
      need_intervention: dto.need_intervention,
    };
  }

  getAiResponseStream(studentId: string, dto: SendChatMessageDto): Observable<any> {
    return new Observable((subscriber) => {
      this.sendMessage(studentId, dto).then(async ({ dialog, need_intervention }) => {
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
            student_profile,
            need_intervention
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
            // AI 서버 규격(session_id, student_id)에 맞춰 데이터 전송
            this.requestAiAnalysis(
              conversation_history,
              student_profile,
              dialog.session_id,
              studentId,
              aiFullContent.trim()
            );
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
   * AI 서버는 session_id와 student_id를 기반으로 내부적으로 dialog를 찾아 처리합니다.
   */
  private requestAiAnalysis(history: any[], profile: any, sessionId: number, studentId: string, aiResponse: string) {
    const updatedHistory = [...history, { role: 'model', text: aiResponse }];

    // AI 서버 규격에 맞춰 전송 (dialog_id, callback_url 대신 session_id, student_id 사용)
    axios.post(`${AI_SERVER_URL}/api/analyze`, {
      conversation_history: updatedHistory,
      student_profile: profile,
      session_id: sessionId,
      student_id: studentId
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

    if (!dialog) throw new NotFoundException('받은 dialogId를 가진 대화를 찾을 수 없습니다.');

    const teacherId = dialog.sessions.teacher_id;

    // 1. 기존 누적 배열에 새 분석 결과 추가 (없으면 빈 배열로 시작)
    const existing = Array.isArray(dialog.real_time_analysis)
      ? dialog.real_time_analysis
      : [];
    const updatedSummaries = [...existing, analysis];

    await this.prisma.dialogs.update({
      where: { id: dialogId },
      data: {
        real_time_analysis: updatedSummaries as any
      }
    });

    // 2. 경고 조건 체크 및 선생님에게 warning 이벤트 발송
    if (analysis.need_intervention) {
      this.eventsGateway.sendToUser(teacherId, 'student_warning', {
        student_id: dialog.student_id,
        one_line_summary: analysis.one_line_summary
      });
    }

    // 3. 선생님에게는 최신 분석 결과 1건만 소켓으로 발송
    this.eventsGateway.sendToUser(teacherId, 'student_analysis_ready', {
      dialog_id: dialogId,
      student_id: dialog.student_id,
      analysis: analysis  // 최신 것만 전송 (대시보드 갱신용)
    });
    return { status: 'ok' };
  }

  async deleteMessages(dialogId: number, userId: string, role: string) {
    const dialog = await this.prisma.dialogs.findUnique({
      where: { id: dialogId },
      include: { sessions: true }
    });

    if (!dialog) throw new NotFoundException('대화를 찾을 수 없습니다.');

    // 권한 확인: 본인, 해당 클래스 선생님, 혹은 관리자
    if (role !== 'ADMIN' && dialog.student_id !== userId && dialog.sessions.teacher_id !== userId) {
      throw new UnauthorizedException('권한이 없습니다.');
    }

    // 1. 채팅 메시지 삭제
    await this.prisma.chat_messages.deleteMany({
      where: { dialog_id: dialogId }
    });

    // 2. 실시간 분석 결과도 초기화
    await this.prisma.dialogs.update({
      where: { id: dialogId },
      data: {
        real_time_analysis: [],
        is_analyzed: false
      }
    });

    return { status: 'deleted' };
  }

  /**
   * 세션 시작 또는 학생 참여 시 AI의 첫인사를 개인화하여 생성합니다. (SSE 스트리밍)
   */
  generateGreeting(dialogId: number, studentId: string): Observable<any> {
    return new Observable((subscriber) => {
      (async () => {
        try {
          const dialog = await this.prisma.dialogs.findUnique({
            where: { id: dialogId },
            include: { sessions: { include: { classes: true } } }
          });

          if (!dialog) throw new Error('대화를 찾을 수 없습니다.');
          const session = dialog.sessions;

          if (dialog.student_id !== studentId) {
            throw new UnauthorizedException('본인의 대화에서만 생성이 가능합니다.');
          }

          // 이미 대화 내역(인사말 등)이 존재하는지 확인하여 중복 생성 방지
          const existingMessages = await this.prisma.chat_messages.findFirst({
            where: { dialog_id: dialogId }
          });

          if (existingMessages) {
            subscriber.complete();
            return;
          }

          // 1. 학생 프로필 구성
          const student = await this.prisma.users.findUnique({
            where: { id: studentId },
            select: { name: true }
          });
          const studentName = student?.name || '학생';

          const student_profile = {
            subject: session.classes?.subject || '미설정',
            scope: session.session_name,
            learning_objectives: session.objective || '미설정',
            key_concepts: session.explanation || '미설정',
            topic_hints: [],
          };

          // 2. 가상의 첫 발화(Prompt) 작성 (DB 저장 X, 학생 이름 포함하여 개인화)
          const conversation_history = [
            {
              role: 'user',
              text: `안녕하세요 선생님! 오늘 수업 시작할 준비가 되었습니다. 제 이름은 ${studentName}입니다. 오늘 배울 내용에 대해 저에게 개인화해서 친근하게 먼저 인사를 건네주세요.`
            }
          ];

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
            const content = aiFullContent.trim();
            if (content) {
              // 3. AI 메시지만 DB에 저장 및 전송 (Prompt는 저장하지 않음)
              await this.saveAiMessage(dialogId, content, session.teacher_id);
            }
            subscriber.complete();
          });

          response.data.on('error', (err: any) => {
            console.error('Greeting AI stream error:', err);
            subscriber.error(err);
          });

        } catch (err) {
          console.error('Failed to trigger greeting from AI:', err.message);
          subscriber.error(err);
        }
      })();
    });
  }
}
