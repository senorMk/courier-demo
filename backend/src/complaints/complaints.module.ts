import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplaintsService } from './complaints.service';
import { ComplaintsController } from './complaints.controller';

@Module({
  imports: [PrismaModule],
  providers: [ComplaintsService],
  controllers: [ComplaintsController],
})
export class ComplaintsModule {}

