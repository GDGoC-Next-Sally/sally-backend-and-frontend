import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { user_role } from '.prisma/client'

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) { }

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

    return this.prisma.classes.create({
      data: {
        ...createClassDto,
        teacher_id: userId,
        invite_code: inviteCode,
      }
    })
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
    // 학생이 요청했을 때와 선생님이 요청했을 때의 정보량 차이?
    return classEntity;
  }

  async update(id: number, updateClassDto: UpdateClassDto, teacherId: string) {
    await this.findOne(id, teacherId); // check ownership

    return this.prisma.classes.update({
      where: { id },
      data: updateClassDto
    });
  }

  async remove(id: number, teacherId: string) {
    await this.findOne(id, teacherId); // check ownership

    return this.prisma.classes.delete({
      where: { id }
    });
  }
}
