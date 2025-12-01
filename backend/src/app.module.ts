
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigFactory } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TripsModule } from './trips/trips.module';
import { DriversModule } from './drivers/drivers.module';
import { SidersModule } from './siders/siders.module';
import { TrucksModule } from './trucks/trucks.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { ParcelQueriesModule } from './parcel-queries/parcel-queries.module';
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
import { ScanningModule } from './scanning/scanning.module';
import { ReportsModule } from './reports/reports.module';
import { TimeModule } from "./common/time/time.module";
import { BaysModule } from './bays/bays.module';


@Module({
  imports: [
    ConfigModule.forRoot<IConfiguration>({
      isGlobal: true,
     load: [configuration],
      envFilePath: '.env',
      validationSchema: environmentSchema,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60 * 1000, // 1 minute
      limit: 10, // 10 requests per minute per IP
    }]),
    PrismaModule,
    AuthModule,
    TripsModule,
    DriversModule,
    SidersModule,
    TrucksModule,
    ComplaintsModule,
    ParcelQueriesModule,
    UsersModule,
    LogsModule,
    CustomerModule,
    ParcelModule,
    RoutesModule,
    ScanningModule,
    BaysModule,
    ReportsModule,
    TimeModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
