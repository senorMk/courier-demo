import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportExporterService } from './report-exporter.service';

@Module({
  imports: [PrismaModule],
  providers: [ReportsService, ReportExporterService],
  controllers: [ReportsController],
})
export class ReportsModule {}
