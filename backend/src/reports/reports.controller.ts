import { Controller, Post, Get, Query, Req, Res, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Request, Response } from 'express';
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

const CASHIER_REVENUE_REPORT_ROLES = [
  'managing-director',
  'operations-officer',
  'supervisor',
  'cashier',
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
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Query('cashierId') cashierId?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) :
                          (officeId ? [officeId] : undefined);
    return this.reports.getRevenueReport({ startDate, endDate, granularity, officeIds: parsedOfficeIds, cashierId });
  }

  @Get('revenue/export')
  @SetMetadata('roles', REVENUE_REPORT_ROLES)
  async downloadRevenue(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('granularity') granularity: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Query('cashierId') cashierId?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) :
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportRevenueReport({ startDate, endDate, granularity, format, officeIds: parsedOfficeIds, cashierId });
    this.sendFile(res, file);
  }

  @Get('parcel-movement')
  @SetMetadata('roles', PARCEL_REPORT_ROLES)
  getParcelMovement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    return this.reports.getParcelMovementReport({ startDate, endDate, officeIds: parsedOfficeIds });
  }

  @Get('parcel-movement/export')
  @SetMetadata('roles', PARCEL_REPORT_ROLES)
  async downloadParcelMovement(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportParcelMovementReport({ startDate, endDate, format, officeIds: parsedOfficeIds });
    this.sendFile(res, file);
  }

  @Get('complaints')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  getComplaintsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    return this.reports.getComplaintReport({ startDate, endDate, officeIds: parsedOfficeIds });
  }

  @Get('complaints/export')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  async downloadComplaints(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportComplaintReport({ startDate, endDate, format, officeIds: parsedOfficeIds });
    this.sendFile(res, file);
  }

  @Get('driver-trips')
  @SetMetadata('roles', DRIVER_TRIP_REPORT_ROLES)
  getDriverTripReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    return this.reports.getDriverTripReport({ startDate, endDate, officeIds: parsedOfficeIds });
  }

  @Get('driver-trips/export')
  @SetMetadata('roles', DRIVER_TRIP_REPORT_ROLES)
  async downloadDriverTrips(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportDriverTripReport({ startDate, endDate, format, officeIds: parsedOfficeIds });
    this.sendFile(res, file);
  }

  @Get('zicta')
  @SetMetadata('roles', ZICTA_REPORT_ROLES)
  getZictaReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    return this.reports.getZictaReport({ startDate, endDate, officeIds: parsedOfficeIds });
  }

  @Get('zicta/export')
  @SetMetadata('roles', ZICTA_REPORT_ROLES)
  async downloadZicta(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) : 
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportZictaReport({ startDate, endDate, format, officeIds: parsedOfficeIds });
    this.sendFile(res, file);
  }

  @Get('cashier-revenue')
  @SetMetadata('roles', CASHIER_REVENUE_REPORT_ROLES)
  getCashierRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cashierId') cashierId?: string,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) :
                          (officeId ? [officeId] : undefined);
    return this.reports.getCashierRevenueReport({ startDate, endDate, cashierId, officeIds: parsedOfficeIds });
  }

  @Get('cashier-revenue/export')
  @SetMetadata('roles', CASHIER_REVENUE_REPORT_ROLES)
  async downloadCashierRevenue(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('cashierId') cashierId: string | undefined,
    @Query('format') format: string | undefined,
    @Query('officeId') officeId?: string,
    @Query('officeIds') officeIds?: string,
    @Res() res?: Response,
  ) {
    // Support both single officeId and multiple officeIds
    const parsedOfficeIds = officeIds ? officeIds.split(',').filter(id => id.trim()) :
                          (officeId ? [officeId] : undefined);
    const file = await this.reports.exportCashierRevenueReport({ startDate, endDate, cashierId, format, officeIds: parsedOfficeIds });
    this.sendFile(res, file);
  }

  @Get('supervisor-metrics')
  @SetMetadata('roles', ['supervisor', 'managing-director', 'operations-officer'])
  getSupervisorMetrics(
    @Query('date') date?: string,
    @Req() req?: Request,
  ) {
    const user: any = (req as any)?.user || {};
    const officeId = user?.officeId;
    return this.reports.getSupervisorMetrics({ date, officeId });
  }

  @Post('fix-cashier-payments')
  @SetMetadata('roles', ['managing-director'])
  async fixCashierPayments() {
    return this.reports.fixPaymentsWithNullCashier();
  }

  private sendFile(res: Response, file: ReportExportResult) {
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  }
}
