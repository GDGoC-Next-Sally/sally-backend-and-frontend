import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './providers/supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { PrismaModule } from './providers/prisma/prisma.module';
import { StorageModule } from './providers/storage/storage.module';
import { GatewaysModule } from './common/gateways/gateways.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    SupabaseModule,
    ClassesModule,
    PrismaModule,
    StorageModule,
    GatewaysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
