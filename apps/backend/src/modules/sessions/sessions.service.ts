import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(teacherId: string, createSessionDto: CreateSessionDto) {
    // TODO: Implement
    const classData = await this.prisma.classes.findUnique({
      where: { id: createSessionDto.class_id },
    });

    if (!classData) {
      throw new Error('Class not found');
    }

    const session = await this.prisma.sessions.create({
      data: {
        ...createSessionDto,
        teacher_id: teacherId,
      },
    });

    this.eventsGateway.forceJoinRoom(teacherId, `session:${session.id}`);
    this.eventsGateway.sendToRoom(`session:${session.id}`, 'session_created', session);

    return session;
  }

  async findAllByClassId(classId: number, userId: string) {
    // TODO: Implement
    const classData = await this.prisma.classes.findFirst({
      where: { id: classId }
    });
    if (!classData) {
      throw new NotFoundException('Class not found');
    }

    const teacherId = classData.teacher_id;
    const isEnrolled = await this.prisma.takes.findFirst({
      where: { class_id: classId, student_id: userId },
    });

    if (teacherId !== userId && !isEnrolled) {
      throw new Error('User is not a member of this class');
    }

    return this.prisma.sessions.findMany({
      where: { class_id: classId },
      orderBy: { 
        scheduled_start: 'desc'
      },
    });
  }

  async findOne(id: number, userId: string) {
    const session = await this.prisma.sessions.findUnique({
      where: { id }
    });

    if (!session) throw new NotFoundException(`Session #${id} not found`);

    const isEnrolled = await this.prisma.takes.findFirst({
      where: { class_id: session.class_id, student_id: userId },
    });

    if (session.teacher_id !== userId && !isEnrolled) {
      throw new UnauthorizedException('Access denied');
    }

    return session;
  }

  async update(id: number, teacherId: string, updateSessionDto: UpdateSessionDto) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`Session #${id} not found`);
    
    if (session.teacher_id !== teacherId) {
      throw new UnauthorizedException('You are not the owner of this session');
    }

    return this.prisma.sessions.update({
      where: { id },
      data: updateSessionDto
    });
  }

  async remove(id: number, teacherId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`Session #${id} not found`);
    
    if (session.teacher_id !== teacherId) {
      throw new UnauthorizedException('You are not the owner of this session');
    }

    return this.prisma.sessions.delete({ where: { id } });
  }
}
