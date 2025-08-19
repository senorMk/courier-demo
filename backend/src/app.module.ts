
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigFactory } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LogsModule } from './logs/logs.module';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { IConfiguration } from './env.configuration.interface';
import configuration from './config/env.configuration';
import environmentSchema from './config/env.validation';
import { HealthController } from "./health.controller";


@Module({
  imports: [
    ConfigModule.forRoot<IConfiguration>({
      isGlobal: true,
     load: [configuration],
      envFilePath: '.env',
      validationSchema: environmentSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LogsModule,
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
