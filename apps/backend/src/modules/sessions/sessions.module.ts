import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { GatewaysModule } from '../../common/gateways/gateways.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [PrismaModule, GatewaysModule, ReportsModule],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule { }
