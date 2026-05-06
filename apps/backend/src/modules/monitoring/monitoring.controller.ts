import { Controller, Get, Param, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { SendInterventionDto } from './dto/send-intervention.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role as UserRole } from '.prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('intervention')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '선생님 개입 메시지 전송 (소켓으로 학생에게 전달)' })
  sendIntervention(@Req() req: any, @Body() dto: SendInterventionDto) {
    return this.monitoringService.sendIntervention(req.user.userId, dto);
  }

  @Get('session/:sessionId/students')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '세션 내 학생 모니터링 목록 조회' })
  getStudents(@Req() req: any, @Param('sessionId') sessionId: string) {
    return this.monitoringService.getStudents(req.user.userId, +sessionId);
  }

  @Get('dialog/:dialogId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '특정 학생의 상세 대화 및 분석 내역 조회' })
  getStudentDetail(@Req() req: any, @Param('dialogId') dialogId: string) {
    return this.monitoringService.getStudentDetail(req.user.userId, +dialogId);
  }

  @Post('session/:sessionId/announcement')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '세션 전체 공지 전송' })
  sendGlobalAnnouncement(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body('content') content: string
  ) {
    return this.monitoringService.sendGlobalAnnouncement(req.user.userId, +sessionId, content);
  }
}
