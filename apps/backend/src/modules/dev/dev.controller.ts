import { Controller, Get, Post, Param, Res } from '@nestjs/common';
import { DevService } from './dev.service';
import { ReportsService } from '../reports/reports.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';
import type { Response } from 'express';

@ApiTags('dev')
@Controller('dev')
export class DevController {
  constructor(
    private readonly devService: DevService,
    private readonly reportsService: ReportsService
  ) {}

  @Post('seed')
  @ApiOperation({ summary: '테스트용 더미 데이터 세팅 및 JWT 토큰 발급' })
  async seed() {
    return this.devService.seedAndGetTokens();
  }

  @Post('import-prompts')
  @ApiOperation({ summary: 'JSON 파일로부터 유닛 프롬프트 임포트' })
  async importPrompts() {
    return this.devService.importUnitPrompts();
  }

  @Post('dummy-chat/:dialogId')
  @ApiOperation({ summary: '더미 채팅 데이터 삽입' })
  async insertDummyChat(@Param('dialogId') dialogId: string) {
    return this.devService.insertDummyChat(parseInt(dialogId, 10));
  }

  @Post('report/student/:sessionId/:teacherId')
  @ApiOperation({ summary: '학생 리포트 생성 트리거' })
  async triggerStudentReport(
    @Param('sessionId') sessionId: string,
    @Param('teacherId') teacherId: string
  ) {
    await this.reportsService.requestStudentFinalReports(parseInt(sessionId, 10), teacherId);
    return { message: '학생 개별 리포트 생성 요청 완료' };
  }

  @Post('report/session/:sessionId/:teacherId')
  @ApiOperation({ summary: '세션 리포트 생성 트리거' })
  async triggerSessionReport(
    @Param('sessionId') sessionId: string,
    @Param('teacherId') teacherId: string
  ) {
    await this.reportsService.requestSessionFinalReport(parseInt(sessionId, 10), teacherId);
    return { message: '세션 전체 리포트 생성 요청 완료' };
  }

  @Get('ui')
  @ApiOperation({ summary: '원클릭 개발자용 채팅 테스트 UI' })
  getUi(@Res() res: Response) {
    const htmlPath = path.join(process.cwd(), 'src/modules/dev/dev-chat.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.type('html').send(html);
  }
}
