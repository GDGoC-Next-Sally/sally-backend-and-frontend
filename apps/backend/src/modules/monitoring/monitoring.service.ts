import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { SendInterventionDto } from '../livechat/dto/send-intervention.dto';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

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
        content: dto.content,
      }
    });

    // 2. 학생에게 소켓으로 전송
    this.eventsGateway.sendToUser(dialog.student_id, 'teacher_intervention', {
      ...interventionMessage,
      type: dto.type || 'ADVICE'
    });

    return interventionMessage;
  }
}
