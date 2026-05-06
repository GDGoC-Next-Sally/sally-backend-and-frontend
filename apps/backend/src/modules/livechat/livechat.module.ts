import { Module } from '@nestjs/common';
import { LivechatService } from './livechat.service';
import { LivechatController } from './livechat.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { GatewaysModule } from '../../common/gateways/gateways.module';

@Module({
  imports: [PrismaModule, GatewaysModule],
  providers: [LivechatService],
  controllers: [LivechatController],
  exports: [LivechatService]
})
export class LivechatModule {}
