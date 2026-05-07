import { Controller, Get, Post, Body, Param, UseGuards, Req, Sse, Headers, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LivechatService } from './livechat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Internal } from '../auth/internal.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { user_role as UserRole } from '.prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('livechat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('livechat')
export class LivechatController {
  constructor(private readonly livechatService: LivechatService) { }

  @Get('dialog/:dialogId')
  @ApiOperation({ summary: '대화방 메시지 내역 조회' })
  getMessages(@Param('dialogId') dialogId: string, @Req() req: any) {
    return this.livechatService.getMessages(+dialogId, req.user.userId, req.user.role);
  }

  @Post('message')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: '학생 메시지 전송 및 AI 응답 스트리밍 (SSE)' })
  @Sse('message')
  sendMessage(@Req() req: any, @Body() dto: SendChatMessageDto): Observable<MessageEvent> {
    return this.livechatService.getAiResponseStream(req.user.userId, dto);
  }

  // FastAPI 전용 콜백 엔드포인트 (JWT 가드 제외 - 내부 서버 간 통신)
  @Internal()  // 가드 우회
  @Post('analytics-callback')
  @ApiOperation({ summary: '(AI 서버 전용) 학생 대화 분석 완료 콜백 웹훅' })
  async analyticsCallback(
    @Headers('x-internal-secret') secret: string,
    @Body() body: { dialog_id: number; analysis: any }
  ) {
    if (secret !== process.env.INTERNAL_SECRET_KEY) {
      throw new UnauthorizedException('내부 요청이 아닙니다.');
    }
    return this.livechatService.handleAnalytics(body.dialog_id, body.analysis);
  }
}
