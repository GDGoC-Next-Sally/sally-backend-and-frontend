import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { SupabaseModule } from '../../providers/supabase/supabase.module';

@Global()
@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewaysModule {}

