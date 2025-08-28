import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScanningService } from './scanning.service';
import { ScanningController } from './scanning.controller';

@Module({
  imports: [PrismaModule],
  providers: [ScanningService],
  controllers: [ScanningController],
})
export class ScanningModule {}
