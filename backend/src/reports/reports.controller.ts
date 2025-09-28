import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
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

  @Get('parcel-movement')
  @SetMetadata('roles', PARCEL_REPORT_ROLES)
  getParcelMovement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getParcelMovementReport({ startDate, endDate });
  }

  @Get('complaints')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  getComplaintsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getComplaintReport({ startDate, endDate });
  }

  @Get('driver-trips')
  @SetMetadata('roles', DRIVER_TRIP_REPORT_ROLES)
  getDriverTripReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getDriverTripReport({ startDate, endDate });
  }

  @Get('zicta')
  @SetMetadata('roles', ZICTA_REPORT_ROLES)
  getZictaReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getZictaReport({ startDate, endDate });
  }
}
