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
    const createdClass = await this.prisma.classes.create({
      data: {
        ...createClassDto,
        teacher_id: userId,
        invite_code: inviteCode,
      }
    })

    this.eventsGateway.forceJoinRoom(userId, `class:${createdClass.id}`);

    return createdClass;
  }

  async reissueInviteCode(userId: string, classId: number) {
    const classEntity = await this.prisma.classes.findFirst({ where: { id: classId, teacher_id: userId } });
    if (!classEntity) {
      throw new NotFoundException(`Class #${classId} not found`);
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
      throw new NotFoundException(`Class #${classId} not found`);
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
      throw new NotFoundException('Invalid invite code');
    }
    return classEntity;
  }

  async findAllByStudentId(studentId: string) {
    return this.prisma.classes.findMany({
      where: { takes: { some: { student_id: studentId } } },
      orderBy: { created_at: 'desc' }
    });
  }

  async findOne(classId: number, userId: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: { id: classId }
    });
    if (!classEntity) {
      throw new NotFoundException(`Class #${classId} not found.`);
    }
    const instructor = classEntity.teacher_id;
    if (instructor === userId) {
      return classEntity;
    }
    else if (await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: userId
      }
    })) {
      return classEntity;
    }
    else {
      throw new UnauthorizedException(`You are not a member of class #${classId}.`);
    }
  }

  async update(id: number, updateClassDto: UpdateClassDto, teacherId: string) {

    const result = await this.prisma.classes.update({
      where: { id, teacher_id: teacherId },
      data: updateClassDto
    });

    if (!result) {
      throw new NotFoundException(`Class #${id} not found.`);
    }

    this.eventsGateway.sendToRoom(`class:${id}`, 'class_updated', result);
    return result;
  }

  async remove(id: number, teacherId: string) {
    const result = await this.prisma.classes.delete({
      where: { id, teacher_id: teacherId }
    });
    if (!result) {
      throw new NotFoundException(`Class #${id} not found.`);
    }

    this.eventsGateway.sendToRoom(`class:${id}`, 'class_deleted', { classId: id });
    this.eventsGateway.deleteRoom(`class:${id}`);
    return result;
  }

  async joinClass(studentId: string, inviteCode: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: {
        invite_code: inviteCode,
        registerable: true
      }
    });
    if (!classEntity) {
      throw new NotFoundException(`Class with invite_code ${inviteCode} not found or registerable is false.`);
    }

    const classId = classEntity.id;

    if (await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: studentId
      }
    })) {
      throw new ConflictException(`Student ${studentId} is already a member of class #${classId}`);
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
      throw new NotFoundException(`Class #${classId} not found or student is not a member of this class.`);
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
      throw new NotFoundException(`Class #${classId} not found.`);
    }

    const takesEntity = await this.prisma.takes.findFirst({
      where: {
        class_id: classId,
        student_id: studentId
      }
    });
    if (!takesEntity) {
      throw new NotFoundException(`Student #${studentId} is not a member of this class.`);
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
