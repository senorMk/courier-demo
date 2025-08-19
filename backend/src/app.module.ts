
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
import { CustomerModule } from './customers/customer.module';
import { ParcelModule } from './parcels/parcel.module';
import { RoutesModule } from './routes/routes.module';


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
    CustomerModule,
    ParcelModule,
    RoutesModule
  ],
  controllers: [AppController, HealthController],
})
export class AppModule {}
