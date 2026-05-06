import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GatewaysModule } from '../../common/gateways/gateways.module';

@Module({
  imports: [GatewaysModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
