import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { SendInterventionDto } from '../livechat/dto/send-intervention.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role as UserRole } from '@prisma/client';
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
}
