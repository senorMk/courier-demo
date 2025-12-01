import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SidersService } from './siders.service';
import { SidersController } from './siders.controller';

@Module({
  imports: [PrismaModule],
  providers: [SidersService],
  controllers: [SidersController],
})
export class SidersModule {}
