import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role as UserRole } from '.prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '새 세션 생성' })
  create(@Req() req: any, @Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(req.user.userId, createSessionDto);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: '클래스별 세션 목록 조회' })
  findAllByClassId(@Param('classId') classId: string, @Req() req: any) {
    return this.sessionsService.findAllByClassId(+classId, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '세션 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.findOne(+id, req.user.userId);
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '세션 정보 수정' })
  update(@Param('id') id: string, @Req() req: any, @Body() updateSessionDto: UpdateSessionDto) {
    return this.sessionsService.update(+id, req.user.userId, updateSessionDto);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '세션 삭제' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.remove(+id, req.user.userId);
  }

  @Post(':id/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업(세션) 시작' })
  startSession(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.startSession(+id, req.user.userId);
  }

  @Post(':id/finish')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '수업(세션) 종료' })
  finishSession(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.finishSession(+id, req.user.userId);
  }

  @Post(':id/join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '학생 수업 참여 (대화방 생성)' })
  joinSession(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.joinSession(+id, req.user.userId);
  }

  @Get(':id/dialogs')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '세션의 학생별 대화방 ID 조회' })
  getSessionDialogs(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.getSessionDialogs(+id, req.user.userId);
  }

  @Get(':id/attendance')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '특정 세션의 출석 명단 조회' })
  getAttendance(@Param('id') id: string, @Req() req: any) {
    return this.sessionsService.getAttendanceBySession(+id, req.user.userId, req.user.role);
  }
}
