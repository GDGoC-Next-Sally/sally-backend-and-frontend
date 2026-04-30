import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { PrismaService } from '../../providers/prisma/prisma.service';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) { }

  private generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 10;
    let inviteCode = '';

    for (let i = 0; i < codeLength; i++) {
      inviteCode += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    
    return inviteCode;
  }

  create(teacherId: string, createClassDto: CreateClassDto) {
    const inviteCode = this.generateInviteCode();
    // 중복체크 로직 필요

    return this.prisma.classes.create({
      data: {
        ...createClassDto,
        teacher_id: teacherId,
        invite_code: inviteCode,
      }
    })
  }

  findAllTeacher(teacherId: string) {
    return this.prisma.classes.findMany({
      where: { teacher_id: teacherId },
      orderBy: { created_at: 'desc' }
    });
  }

  async findOne(id: number, teacherId: string) {
    const classEntity = await this.prisma.classes.findFirst({
      where: { id, teacher_id: teacherId }
    });

    if (!classEntity) {
      throw new NotFoundException(`Class #${id} not found or you don't have permission`);
    }

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
