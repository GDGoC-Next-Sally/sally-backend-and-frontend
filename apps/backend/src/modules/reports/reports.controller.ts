import { Controller, Get, Param, UseGuards, Req, ParseIntPipe, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role as UserRole } from '.prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('session/:sessionId/students')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '(선생님용) 특정 세션의 모든 학생 리포트 목록 조회' })
  getStudentReports(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.reportsService.getStudentReportsBySession(sessionId);
  }

  @Get('session/:sessionId/me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '(학생용) 나의 특정 세션 리포트 상세 조회' })
  getMySessionReport(@Param('sessionId', ParseIntPipe) sessionId: number, @Req() req: any) {
    return this.reportsService.getStudentSessionReport(sessionId, req.user.userId);
  }

  @Get('student/sessions')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '(학생용) 내가 참여한 지난 세션 목록 조회' })
  @ApiQuery({ name: 'classId', required: false, description: '특정 클래스의 세션만 필터링하고 싶을 때 전달' })
  getStudentSessionList(
    @Req() req: any,
    @Query('classId') classId?: string
  ) {
    return this.reportsService.getStudentSessionList(
      req.user.userId, 
      classId ? parseInt(classId, 10) : undefined
    );
  }

  @Get('session/:sessionId/summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '(선생님용) 특정 세션의 전체 요약 리포트 조회' })
  getSessionReport(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.reportsService.getSessionReport(sessionId);
  }

  @Get('class/:classId/summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '(선생님용) 특정 클래스의 전체 통계 리포트 조회' })
  getClassReport(@Param('classId', ParseIntPipe) classId: number) {
    return this.reportsService.getClassReport(classId);
  }
}
