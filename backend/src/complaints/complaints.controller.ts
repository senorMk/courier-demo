import { Body, Controller, Get, Param, Post, Query, SetMetadata, UseGuards, BadRequestException, Req } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Request } from 'express';

const COMPLAINT_LOG_ROLES = [
  "managing-director",
  "supervisor",
  "cashier",
  "customer-service-agent",
  "customer-service-director",
] as const;

const COMPLAINT_MANAGE_ROLES = [
  "managing-director",
  "supervisor",
  "customer-service-agent",
  "customer-service-director",
] as const;

const COMPLAINT_REPORT_ROLES = [
  "managing-director",
  "customer-service-director",
] as const;

@Controller('api/v1/complaints')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ComplaintsController {
  constructor(private service: ComplaintsService) {}

  @Post('damaged')
  @SetMetadata('roles', COMPLAINT_LOG_ROLES)
  fileDamaged(@Body() body: { code: string; reason?: string }, @Req() req: Request) {
    if (!body?.code) {
      throw new BadRequestException('Tracking code is required');
    }
    const reporterId = this.extractUserId(req);
    return this.service.fileDamagedByCode(body.code.trim(), reporterId, body.reason);
  }

  @Post('from-collected')
  @SetMetadata('roles', COMPLAINT_LOG_ROLES)
  fileFromCollected(@Body() body: { code: string; reason?: string }, @Req() req: Request) {
    if (!body?.code) {
      throw new BadRequestException('Tracking code is required');
    }
    const reporterId = this.extractUserId(req);
    return this.service.fileFromCollectedByCode(body.code.trim(), reporterId, body.reason);
  }

  @Get('paginated')
  @SetMetadata('roles', COMPLAINT_MANAGE_ROLES)
  list(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: 'OPEN' | 'CLOSED',
  ) {
    return this.service.list(Number(page), Number(pageSize), status as any);
  }

  @Post(':id/close')
  @SetMetadata('roles', COMPLAINT_MANAGE_ROLES)
  close(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.close(id, body?.note);
  }

  @Get(':id/events')
  @SetMetadata('roles', COMPLAINT_MANAGE_ROLES)
  events(@Param('id') id: string) {
    return this.service.getEvents(id);
  }

  // Generic complaint logging (explicit button on parcel UI)
  @Post('log')
  @SetMetadata('roles', COMPLAINT_LOG_ROLES)
  log(@Body() body: { parcelId?: string; code?: string; reason?: string }, @Req() req: Request) {
    const reporterId = this.extractUserId(req);
    return this.service.logGeneric({ ...body, reporterId });
  }

  // Report summary for dashboard (director)
  @Get('report/summary')
  @SetMetadata('roles', COMPLAINT_REPORT_ROLES)
  report(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.report(startDate, endDate);
  }

  private extractUserId(req: Request): string {
    const user: any = req?.user || {};
    const reporterId = user?.sub || user?.id || user?.userId;
    if (!reporterId) {
      throw new BadRequestException('User context missing');
    }
    return reporterId;
  }
}
