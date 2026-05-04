import { Controller, Get, Post, Body, Param, UseGuards, Req, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LivechatService } from './livechat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { SendInterventionDto } from './dto/send-intervention.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { user_role as UserRole } from '.prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('livechat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('livechat')
export class LivechatController {
  constructor(private readonly livechatService: LivechatService) {}

  @Get('dialog/:dialogId')
  @ApiOperation({ summary: '대화방 메시지 내역 조회' })
  getMessages(@Param('dialogId') dialogId: string, @Req() req: any) {
    return this.livechatService.getMessages(+dialogId, req.user.userId, req.user.role);
  }

  @Post('intervention')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: '선생님 개입 메시지 전송 (소켓으로 학생에게 전달)' })
  sendIntervention(@Req() req: any, @Body() dto: SendInterventionDto) {
    return this.livechatService.sendIntervention(req.user.userId, dto);
  }

  @Post('message')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '학생 메시지 전송 및 AI 응답 스트리밍 (SSE)' })
  @Sse('message')
  sendMessage(@Req() req: any, @Body() dto: SendChatMessageDto): Observable<MessageEvent> {
    return this.livechatService.getAiResponseStream(req.user.userId, dto);
  }

  @Post('analytics-callback')
  @ApiOperation({ summary: '(AI 서버 전용) 학생 대화 분석 콜백 웹훅' })
  async analyticsCallback(@Body() body: { dialog_id: number; analysis: any }) {
    return this.livechatService.handleAnalyticsCallback(body.dialog_id, body.analysis);
  }
}
