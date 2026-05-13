import { Module } from '@nestjs/common';
import { SupplementaryService } from './supplementary.service';
import { SupplementaryController } from './supplementary.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SupplementaryService],
  controllers: [SupplementaryController],
  exports: [SupplementaryService],
})
export class SupplementaryModule {}
