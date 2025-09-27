import { Controller, Get, Query, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('revenue')
  getRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.reports.getRevenueReport({ startDate, endDate, granularity });
  }

  @Get('parcel-movement')
  getParcelMovement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getParcelMovementReport({ startDate, endDate });
  }

  @Get('complaints')
  getComplaintsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getComplaintReport({ startDate, endDate });
  }

  @Get('driver-trips')
  getDriverTripReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getDriverTripReport({ startDate, endDate });
  }

  @Get('zicta')
  getZictaReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reports.getZictaReport({ startDate, endDate });
  }
}
