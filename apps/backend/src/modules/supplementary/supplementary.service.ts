import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { CreateUnitPromptDto } from './dto/create-unit-prompt.dto';
import { UpdateUnitPromptDto } from './dto/update-unit-prompt.dto';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { UpdateTextbookDto } from './dto/update-textbook.dto';

@Injectable()
export class SupplementaryService {
  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────────────────────────────────────────────
  // Unit Prompts CRUD
  // ────────────────────────────────────────────────────────────

  async getUnitPrompts(textbookId?: number, query?: string) {
    const where: any = {};
    if (textbookId) where.textbook_id = textbookId;
    if (query) where.objective = { contains: query, mode: 'insensitive' };

    return this.prisma.unit_prompts.findMany({
      where,
      include: {
        textbooks: { select: { subject: true, publisher: true } },
        users: { select: { id: true, name: true } },
      },
      orderBy: [{ unit_number: 'asc' }, { created_at: 'desc' }],
    });
  }

  async getUnitPromptById(id: number) {
    const prompt = await this.prisma.unit_prompts.findUnique({
      where: { id },
      include: {
        textbooks: true,
        users: { select: { id: true, name: true } },
      },
    });
    if (!prompt) throw new NotFoundException(`단원 프롬프트 #${id}를 찾을 수 없습니다.`);
    return prompt;
  }

  async createUnitPrompt(userId: string, dto: CreateUnitPromptDto) {
    if (dto.textbook_id) {
      const textbook = await this.prisma.textbooks.findUnique({ where: { id: dto.textbook_id } });
      if (!textbook) throw new NotFoundException(`교과서 #${dto.textbook_id}를 찾을 수 없습니다.`);
    }

    return this.prisma.unit_prompts.create({
      data: {
        ...dto,
        creator_id: userId,
      },
    });
  }

  async updateUnitPrompt(id: number, userId: string, dto: UpdateUnitPromptDto) {
    const prompt = await this.prisma.unit_prompts.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`단원 프롬프트 #${id}를 찾을 수 없습니다.`);

    if (prompt.creator_id !== userId) {
      throw new ForbiddenException('본인이 작성한 프롬프트만 수정할 수 있습니다.');
    }

    if (dto.textbook_id) {
      const textbook = await this.prisma.textbooks.findUnique({ where: { id: dto.textbook_id } });
      if (!textbook) throw new NotFoundException(`교과서 #${dto.textbook_id}를 찾을 수 없습니다.`);
    }

    return this.prisma.unit_prompts.update({
      where: { id },
      data: dto,
    });
  }

  async removeUnitPrompt(id: number, userId: string) {
    const prompt = await this.prisma.unit_prompts.findUnique({ where: { id } });
    if (!prompt) throw new NotFoundException(`단원 프롬프트 #${id}를 찾을 수 없습니다.`);

    if (prompt.creator_id !== userId) {
      throw new ForbiddenException('본인이 작성한 프롬프트만 삭제할 수 있습니다.');
    }

    return this.prisma.unit_prompts.delete({ where: { id } });
  }

  // ────────────────────────────────────────────────────────────
  // Textbooks CRUD
  // ────────────────────────────────────────────────────────────

  async getTextbooks(query?: string) {
    return this.prisma.textbooks.findMany({
      where: query ? {
        OR: [
          { subject: { contains: query, mode: 'insensitive' } },
          { publisher: { contains: query, mode: 'insensitive' } },
        ],
      } : undefined,
      include: { _count: { select: { unit_prompts: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async getTextbookById(id: number) {
    const textbook = await this.prisma.textbooks.findUnique({
      where: { id },
      include: { unit_prompts: true },
    });
    if (!textbook) throw new NotFoundException(`교과서 #${id}를 찾을 수 없습니다.`);
    return textbook;
  }

  async createTextbook(dto: CreateTextbookDto) {
    return this.prisma.textbooks.create({ data: dto });
  }

  async updateTextbook(id: number, dto: UpdateTextbookDto) {
    const textbook = await this.prisma.textbooks.findUnique({ where: { id } });
    if (!textbook) throw new NotFoundException(`교과서 #${id}를 찾을 수 없습니다.`);

    return this.prisma.textbooks.update({
      where: { id },
      data: dto,
    });
  }

  async removeTextbook(id: number) {
    const textbook = await this.prisma.textbooks.findUnique({ where: { id } });
    if (!textbook) throw new NotFoundException(`교과서 #${id}를 찾을 수 없습니다.`);

    return this.prisma.textbooks.delete({ where: { id } });
  }
}
