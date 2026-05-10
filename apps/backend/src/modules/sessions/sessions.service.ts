import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';
import { ReportsService } from '../reports/reports.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly reportsService: ReportsService,
  ) {}

  async create(teacherId: string, createSessionDto: CreateSessionDto) {
    const classData = await this.prisma.classes.findUnique({
      where: { id: createSessionDto.class_id },
    });

    if (!classData) {
      throw new NotFoundException('수업을 찾을 수 없습니다.');
    }

    if (classData.teacher_id !== teacherId) {
      throw new UnauthorizedException('수업을 생성할 권한이 없습니다.');
    }

    const { scheduled_date, scheduled_start, scheduled_end, ...rest } = createSessionDto;

    const session = await this.prisma.sessions.create({
      data: {
        ...rest,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
        scheduled_start: scheduled_start ? new Date(scheduled_start) : null,
        scheduled_end: scheduled_end ? new Date(scheduled_end) : null,
        teacher_id: teacherId,
      },
    });

    this.eventsGateway.forceJoinRoom(teacherId, `session:${session.id}`);
    this.eventsGateway.sendToRoom(`session:${session.id}`, 'session_created', session);

    return session;
  }

  async findAllByClassId(classId: number, userId: string) {
    const classData = await this.prisma.classes.findFirst({
      where: { id: classId }
    });
    if (!classData) {
      throw new NotFoundException('수업을 찾을 수 없습니다.');
    }

    const teacherId = classData.teacher_id;
    const isEnrolled = await this.prisma.takes.findFirst({
      where: { class_id: classId, student_id: userId },
    });

    if (teacherId !== userId && !isEnrolled) {
      throw new UnauthorizedException('수업에 참여할 권한이 없습니다.');
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

    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);

    const isEnrolled = await this.prisma.takes.findFirst({
      where: { class_id: session.class_id, student_id: userId },
    });

    if (session.teacher_id !== userId && !isEnrolled) {
      throw new UnauthorizedException('수업을 조회할 권한이 없습니다.');
    }

    return session;
  }

  async update(id: number, teacherId: string, updateSessionDto: UpdateSessionDto) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);
    
    if (session.teacher_id !== teacherId) {
      throw new UnauthorizedException('수업을 수정할 권한이 없습니다.');
    }

    const { scheduled_date, scheduled_start, scheduled_end, ...rest } = updateSessionDto;

    return this.prisma.sessions.update({
      where: { id },
      data: {
        ...rest,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : undefined,
        scheduled_start: scheduled_start ? new Date(scheduled_start) : undefined,
        scheduled_end: scheduled_end ? new Date(scheduled_end) : undefined,
      }
    });
  }

  async remove(id: number, teacherId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);
    
    if (session.teacher_id !== teacherId) {
      throw new UnauthorizedException('수업을 삭제할 권한이 없습니다.');
    }

    return this.prisma.sessions.delete({ where: { id } });
  }

  async startSession(id: number, teacherId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);
    if (session.teacher_id !== teacherId) throw new UnauthorizedException('수업을 시작할 권한이 없습니다.');

    const updatedSession = await this.prisma.sessions.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        started_at: new Date()
      }
    });

    this.eventsGateway.sendToRoom(`session:${id}`, 'session_started', updatedSession);
    return updatedSession;
  }

  async finishSession(id: number, teacherId: string) {
    const session = await this.prisma.sessions.findUnique({
      where: { id },
      include: { classes: true },
    });
    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);
    if (session.teacher_id !== teacherId) throw new UnauthorizedException('수업을 종료할 권한이 없습니다.');

    const updatedSession = await this.prisma.sessions.update({
      where: { id },
      data: {
        status: 'FINISHED',
        finished_at: new Date()
      }
    });

    this.eventsGateway.sendToRoom(`session:${id}`, 'session_finished', updatedSession);

    // 세션에 속한 모든 학생 다이얼로그 조회 후 AI 서버에 최종 리포트 요청 (비동기, fire and forget)
    this.prisma.dialogs.findMany({
      where: { session_id: id },
      select: { student_id: true, real_time_analysis: true },
    }).then(dialogs => {
      this.reportsService.requestFinalReports(id, teacherId, dialogs, session);
    }).catch(err => {
      console.error(`Failed to fetch dialogs for final report (session ${id}):`, err.message);
    });

    return updatedSession;
  }

  async joinSession(id: number, studentId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id } });
    if (!session) throw new NotFoundException(`세션 #${id}를 찾을 수 없습니다.`);
    
    if (session.status === 'FINISHED') {
      throw new BadRequestException('이미 종료된 수업 세션입니다.');
    }

    const isEnrolled = await this.prisma.takes.findFirst({
      where: { class_id: session.class_id, student_id: studentId },
    });
    if (!isEnrolled) throw new UnauthorizedException('수업에 참여할 권한이 없습니다.');

    // 다이얼로그(채팅방)가 없으면 생성
    let dialog = await this.prisma.dialogs.findUnique({
      where: { session_id_student_id: { session_id: id, student_id: studentId } }
    });

    if (!dialog) {
      dialog = await this.prisma.dialogs.create({
        data: {
          session_id: id,
          student_id: studentId,
          real_time_analysis: []
        }
      });
    }

    // 출석 기록
    await this.prisma.attends.upsert({
      where: { student_id_session_id: { student_id: studentId, session_id: id } },
      update: {},
      create: { student_id: studentId, session_id: id }
    });

    const studentName = await this.prisma.users.findUnique({
      where: { id: studentId },
      select: { name: true }
    })

    // 학생을 세션 소켓 룸에 입장시킴
    this.eventsGateway.forceJoinRoom(studentId, `session:${id}`);
    this.eventsGateway.sendToRoom(`session:${id}`, 'student_joined', { 
      student_id: studentId,
      student_name: studentName?.name,
      dialog_id: dialog.id
    })

    return {
      dialog,
      session_status: session.status
    };
  }

  async getSessionDialogs(sessionId: number, teacherId: string) {
    const session = await this.prisma.sessions.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`세션 #${sessionId}를 찾을 수 없습니다.`);
    if (session.teacher_id !== teacherId) throw new UnauthorizedException('권한이 없습니다.');

    const dialogs = await this.prisma.dialogs.findMany({
      where: { session_id: sessionId },
      select: { id: true, student_id: true },
    });
    return dialogs.map(d => ({ student_id: d.student_id, dialog_id: d.id }));
  }

  /**
   * 특정 세션의 출석 명단을 조회합니다.
   */
  async getAttendanceBySession(sessionId: number, userId: string, role: string) {
    const session = await this.prisma.sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException(`세션 #${sessionId}를 찾을 수 없습니다.`);

    // 권한 확인: 선생님(본인 수업) 또는 관리자
    if (role !== 'ADMIN' && session.teacher_id !== userId) {
      throw new UnauthorizedException('출석 명단을 조회할 권한이 없습니다.');
    }

    const attendance = await this.prisma.attends.findMany({
      where: { session_id: sessionId },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { created_at: 'asc' }
    });

    return attendance.map(a => ({
      id: a.users.id,
      name: a.users.name,
      email: a.users.email,
      attended_at: a.created_at
    }));
  }
}
