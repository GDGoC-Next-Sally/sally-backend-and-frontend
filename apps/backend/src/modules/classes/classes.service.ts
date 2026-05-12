import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { EventsGateway } from '../../common/gateways/events.gateway';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) { }

  private async generateInviteCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let inviteCode = '';
    let isCodeDuplicated = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (isCodeDuplicated && attempts++ < maxAttempts) {
      inviteCode = '';
      for (let i = 0; i < codeLength; i++) {
        inviteCode += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      const existingClass = await this.prisma.classes.findUnique({ where: { invite_code: inviteCode } });
      isCodeDuplicated = !!existingClass;
    }
    return inviteCode;
  }

  async create(userId: string, createClassDto: CreateClassDto) {
    const inviteCode = await this.generateInviteCode();

    // DTO에서 schedule을 분리하고 나머지만 spread 합니다.
    const { schedule, ...rest } = createClassDto;

    const createdClass = await this.prisma.classes.create({
      data: {
        ...rest,
        schedule: schedule as any,
        teacher_id: userId,
        invite_code: inviteCode,
      }
    });

    this.eventsGateway.forceJoinRoom(userId, `class:${createdClass.id}`);

    return createdClass;
  }


  async reissueInviteCode(userId: string, classId: number) {
    const classEntity = await this.prisma.classes.findFirst({ where: { id: classId, teacher_id: userId } });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    const newInviteCode = await this.generateInviteCode();

    return this.prisma.classes.update({
      where: { id: classId },
      data: { invite_code: newInviteCode },
      select: { id: true, invite_code: true }
    });
  }

  async changeRegisterable(userId: string, classId: number) {
    const classEntity = await this.prisma.classes.findFirst({ where: { id: classId, teacher_id: userId } });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    return this.prisma.classes.update({
      where: { id: classId },
      data: { registerable: !classEntity.registerable }
    });
  }

  async findAllByTeacherId(teacherId: string) {
    return this.prisma.classes.findMany({
      where: { teacher_id: teacherId },
      orderBy: { created_at: 'desc' }
    });
  }

  async findByCode(inviteCode: string) {
    const classEntity = await this.prisma.classes.findUnique({
      where: { invite_code: inviteCode },
      include: { users: { select: { name: true } } }
    });

    if (!classEntity) {
      throw new NotFoundException('잘못된 초대 코드입니다.');
    }
    return classEntity;
  }

  async findAllByStudentId(studentId: string) {
    return this.prisma.classes.findMany({
      where: { takes: { some: { student_id: studentId } } },
      orderBy: { created_at: 'desc' }
    });
  }

  async findOne(classId: number, userId: string, role?: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: { id: classId }
    });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없습니다.`);
    }

    if (role === 'ADMIN') {
      return classEntity;
    }

    const instructor = classEntity.teacher_id;
    if (role === 'TEACHER' && instructor === userId) {
      return classEntity;
    }
    else if (role === 'STUDENT' && await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: userId
      }
    })) {
      return classEntity;
    }
    else {
      throw new UnauthorizedException(`이 클래스의 구성원이 아닙니다.`);
    }
  }

  async update(id: number, updateClassDto: UpdateClassDto, teacherId: string) {
    const { schedule, ...rest } = updateClassDto;

    const result = await this.prisma.classes.update({
      where: { id, teacher_id: teacherId },
      data: {
        ...rest,
        schedule: schedule as any // Json 타입 호환성 해결
      }
    });

    if (!result) {
      throw new NotFoundException(`클래스 #${id}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    this.eventsGateway.sendToRoom(`class:${id}`, 'class_updated', result);
    return result;
  }


  async remove(id: number, teacherId: string) {
    const result = await this.prisma.classes.delete({
      where: { id, teacher_id: teacherId }
    });
    if (!result) {
      throw new NotFoundException(`클래스 #${id}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    this.eventsGateway.sendToRoom(`class:${id}`, 'class_deleted', { classId: id });
    this.eventsGateway.deleteRoom(`class:${id}`);
    return result;
  }

  async getStudents(classId: number, teacherId: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: { id: classId, teacher_id: teacherId }
    });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    const enrollments = await this.prisma.takes.findMany({
      where: { class_id: classId },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { student_id: 'asc' }
    });

    return enrollments.map(e => ({
      id: e.users.id,
      name: e.users.name,
      email: e.users.email,
      enrolled_at: e.created_at
    }));
  }

  async joinClass(studentId: string, inviteCode: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: {
        invite_code: inviteCode,
        registerable: true
      }
    });
    if (!classEntity) {
      throw new NotFoundException(`초대 코드에 맞는 클래스를 찾을 수 없거나 등록이 불가능합니다.`);
    }

    const classId = classEntity.id;

    if (await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: studentId
      }
    })) {
      throw new ConflictException(`이미 클래스의 구성원입니다.`);
    }

    await this.prisma.takes.create({
      data: {
        class_id: classId,
        student_id: studentId
      }
    });

    this.eventsGateway.forceJoinRoom(studentId, `class:${classId}`);

    const teacherId = classEntity.teacher_id;
    this.eventsGateway.sendToUser(teacherId, 'new_student', {
      classId,
      studentId
    });

    return classEntity;
  }

  async leaveClass(classId: number, studentId: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        takes: { some: { student_id: studentId } }
      }
    });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없거나 해당 학생이 구성원이 아닙니다.`);
    }

    this.eventsGateway.forceLeaveRoom(studentId, `class:${classId}`);
    const teacherId = classEntity.teacher_id;
    this.eventsGateway.sendToUser(teacherId, 'student_left', {
      classId,
      studentId
    });

    return this.prisma.takes.delete({
      where: {
        student_id_class_id: {
          class_id: classId,
          student_id: studentId
        }
      }
    });
  }

  async kickStudent(classId: number, teacherId: string, studentId: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: {
        id: classId,
        teacher_id: teacherId
      }
    });
    if (!classEntity) {
      throw new NotFoundException(`클래스 #${classId}를 찾을 수 없거나 해당 클래스의 선생님이 아닙니다.`);
    }

    const takesEntity = await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: studentId
      }
    });
    if (!takesEntity) {
      throw new NotFoundException(`학생 #${studentId}이 이 클래스의 구성원이 아닙니다.`);
    }

    this.eventsGateway.forceLeaveRoom(studentId, `class:${classId}`);
    this.eventsGateway.sendToUser(studentId, 'kicked', {
      classId,
      studentId
    });
    this.eventsGateway.sendToUser(teacherId, 'student_kicked', {
      classId,
      studentId
    });

    return this.prisma.takes.delete({
      where: {
        student_id_class_id: {
          class_id: classId,
          student_id: studentId
        }
      }
    });
  }
}
