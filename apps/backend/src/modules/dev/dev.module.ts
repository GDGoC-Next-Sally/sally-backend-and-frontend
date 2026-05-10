import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { SupabaseModule } from '../../providers/supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
