import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe, Query } from '@nestjs/common';
import { SupplementaryService } from './supplementary.service';
import { CreateUnitPromptDto } from './dto/create-unit-prompt.dto';
import { UpdateUnitPromptDto } from './dto/update-unit-prompt.dto';
import { CreateTextbookDto } from './dto/create-textbook.dto';
import { UpdateTextbookDto } from './dto/update-textbook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role as UserRole } from '.prisma/client';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('supplementary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('supplementary')
export class SupplementaryController {
  constructor(private readonly supplementaryService: SupplementaryService) {}

  // ────────────────────────────────────────────────────────────
  // Unit Prompts
  // ────────────────────────────────────────────────────────────

  @Get('unit-prompts')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '단원 프롬프트 목록 조회 및 검색' })
  @ApiQuery({ name: 'textbookId', required: false, description: '특정 교과서의 프롬프트만 필터링' })
  @ApiQuery({ name: 'query', required: false, description: '학습 목표 검색어' })
  getUnitPrompts(@Query('textbookId') textbookId?: string, @Query('query') query?: string) {
    return this.supplementaryService.getUnitPrompts(textbookId ? +textbookId : undefined, query);
  }

  @Get('unit-prompts/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '단원 프롬프트 상세 조회' })
  getUnitPromptById(@Param('id', ParseIntPipe) id: number) {
    return this.supplementaryService.getUnitPromptById(id);
  }

  @Post('unit-prompts')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '단원 프롬프트 생성' })
  createUnitPrompt(@Req() req: any, @Body() dto: CreateUnitPromptDto) {
    return this.supplementaryService.createUnitPrompt(req.user.userId, dto);
  }

  @Patch('unit-prompts/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '단원 프롬프트 수정 (본인만)' })
  updateUnitPrompt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Body() dto: UpdateUnitPromptDto) {
    return this.supplementaryService.updateUnitPrompt(id, req.user.userId, dto);
  }

  @Delete('unit-prompts/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '단원 프롬프트 삭제 (본인만)' })
  removeUnitPrompt(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.supplementaryService.removeUnitPrompt(id, req.user.userId);
  }

  // ────────────────────────────────────────────────────────────
  // Textbooks
  // ────────────────────────────────────────────────────────────

  @Get('textbooks')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '교과서 목록 조회 및 검색' })
  @ApiQuery({ name: 'query', required: false, description: '과목명 또는 출판사 검색어' })
  getTextbooks(@Query('query') query?: string) {
    return this.supplementaryService.getTextbooks(query);
  }

  @Get('textbooks/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '교과서 상세 조회 (소속 프롬프트 포함)' })
  getTextbookById(@Param('id', ParseIntPipe) id: number) {
    return this.supplementaryService.getTextbookById(id);
  }

  @Post('textbooks')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '교과서 등록' })
  createTextbook(@Body() dto: CreateTextbookDto) {
    return this.supplementaryService.createTextbook(dto);
  }

  @Patch('textbooks/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '교과서 정보 수정' })
  updateTextbook(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTextbookDto) {
    return this.supplementaryService.updateTextbook(id, dto);
  }

  @Delete('textbooks/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '교과서 삭제' })
  removeTextbook(@Param('id', ParseIntPipe) id: number) {
    return this.supplementaryService.removeTextbook(id);
  }
}
