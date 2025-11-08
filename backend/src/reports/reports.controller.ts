import { Controller, Get, Query, Res, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Response } from 'express';
import { ReportExportResult } from './report-exporter.service';
import { ReportsService } from './reports.service';

const REVENUE_REPORT_ROLES = [
  'managing-director',
  'operations-officer',
  'supervisor',
] as const;

const PARCEL_REPORT_ROLES = [
  'managing-director',
  'operations-officer',
  'supervisor',
] as const;

const COMPLAINT_REPORT_ROLES = [
  'managing-director',
  'supervisor',
  'customer-service-director',
] as const;

const DRIVER_TRIP_REPORT_ROLES = [
  'managing-director',
  'operations-officer',
  'dispatcher',
] as const;

const ZICTA_REPORT_ROLES = [
  'managing-director',
  'operations-officer',
] as const;

@Controller('api/v1/reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  @SetMetadata('roles', REVENUE_REPORT_ROLES)
  getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.reports.getRevenueReport({ startDate, endDate, granularity });
  }

  @Get('revenue/export')
  @SetMetadata('roles', REVENUE_REPORT_ROLES)
  async downloadRevenue(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('granularity') granularity: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportRevenueReport({ startDate, endDate, granularity, format });
    this.sendFile(res, file);
  }

  @Get('parcel-movement')
  @SetMetadata('roles', PARCEL_REPORT_ROLES)
  getParcelMovement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getParcelMovementReport({ startDate, endDate });
  }

  @Get('parcel-movement/export')
  @SetMetadata('roles', PARCEL_REPORT_ROLES)
  async downloadParcelMovement(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportParcelMovementReport({ startDate, endDate, format });
    this.sendFile(res, file);
  }

  @Get('complaints')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  getComplaintsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getComplaintReport({ startDate, endDate });
  }

  @Get('complaints/export')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  async downloadComplaints(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportComplaintReport({ startDate, endDate, format });
    this.sendFile(res, file);
  }

  @Get('driver-trips')
  @SetMetadata('roles', DRIVER_TRIP_REPORT_ROLES)
  getDriverTripReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getDriverTripReport({ startDate, endDate });
  }

  @Get('driver-trips/export')
  @SetMetadata('roles', DRIVER_TRIP_REPORT_ROLES)
  async downloadDriverTrips(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportDriverTripReport({ startDate, endDate, format });
    this.sendFile(res, file);
  }

  @Get('zicta')
  @SetMetadata('roles', ZICTA_REPORT_ROLES)
  getZictaReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getZictaReport({ startDate, endDate });
  }

  @Get('zicta/export')
  @SetMetadata('roles', ZICTA_REPORT_ROLES)
  async downloadZicta(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.reports.exportZictaReport({ startDate, endDate, format });
    this.sendFile(res, file);
  }

  private sendFile(res: Response, file: ReportExportResult) {
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  }
}
