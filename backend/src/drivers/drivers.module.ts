import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

@Module({
  imports: [PrismaModule],
  providers: [DriversService],
  controllers: [DriversController],
})
export class DriversModule {}

