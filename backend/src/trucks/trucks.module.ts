import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TrucksService } from './trucks.service';
import { TrucksController } from './trucks.controller';

@Module({
  imports: [PrismaModule],
  providers: [TrucksService],
  controllers: [TrucksController],
})
export class TrucksModule {}

