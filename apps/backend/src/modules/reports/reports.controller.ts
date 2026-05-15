import { Controller, Get, Post, Body, Param, UseGuards, Req, ParseIntPipe, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Internal } from '../auth/internal.decorator';
import { user_role as UserRole } from '.prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}
  
  @Post('session/:sessionId/request-student')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '(선생님용) 특정 세션의 모든 학생 리포트 생성 요청' })
  async requestStudentReports(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: any
  ) {
    await this.reportsService.requestStudentFinalReports(sessionId, req.user.userId);
    return { message: '학생 개별 리포트 생성 요청 완료' };
  }

  @Post('session/:sessionId/request-summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '(선생님용) 특정 세션의 전체 요약 리포트 생성 요청' })
  async requestSessionReport(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Req() req: any
  ) {
    await this.reportsService.requestSessionFinalReport(sessionId, req.user.userId);
    return { message: '세션 전체 리포트 생성 요청 완료' };
  }


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

  @Post('session-report-callback')
  @Internal()
  @ApiOperation({ summary: '(내부 시스템용) AI 서버 세션 전체 리포트 완료 콜백' })
  async sessionReportCallback(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { session_id: number; report: any }
  ) {
    console.log('🔥 SESSION REPORT CALLBACK HIT');
    console.log('Session ID:', body.session_id);
    if (secret !== process.env.INTERNAL_SECRET_KEY) {
      throw new UnauthorizedException('내부 요청이 아닙니다.');
    }
    await this.reportsService.handleSessionFinalReportCallback(body.session_id, body.report);
    return { status: 'ok' };
  }

  @Post('student-report-callback')
  @Internal()
  @ApiOperation({ summary: '(내부 시스템용) AI 서버 학생별 리포트 완료 콜백' })
  async studentReportCallback(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { session_id: number; student_id: string; report: any }
  ) {
    console.log('🔥 STUDENT REPORT CALLBACK HIT');
    console.log('Session ID:', body.session_id, 'Student ID:', body.student_id);
    if (secret !== process.env.INTERNAL_SECRET_KEY) {
      throw new UnauthorizedException('내부 요청이 아닙니다.');
    }
    await this.reportsService.handleStudentFinalReportCallback(body.session_id, body.student_id, body.report);
    return { status: 'ok' };
  }
}
