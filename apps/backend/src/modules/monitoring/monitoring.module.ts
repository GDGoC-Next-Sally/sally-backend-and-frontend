import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { GatewaysModule } from '../../common/gateways/gateways.module';
import { LivechatModule } from '../livechat/livechat.module';

@Module({
  imports: [PrismaModule, GatewaysModule, LivechatModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
