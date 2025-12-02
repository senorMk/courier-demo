import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ParcelQueriesService } from './parcel-queries.service';
import { ParcelQueriesController } from './parcel-queries.controller';

@Module({
  imports: [PrismaModule],
  providers: [ParcelQueriesService],
  controllers: [ParcelQueriesController],
})
export class ParcelQueriesModule {}
