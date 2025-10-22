import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BaysService } from './bays.service';
import { BaysController } from './bays.controller';

@Module({
  imports: [PrismaModule],
  providers: [BaysService],
  controllers: [BaysController],
  exports: [BaysService],
})
export class BaysModule {}
