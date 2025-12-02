import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ParcelQueriesService } from './parcel-queries.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Request } from 'express';
import { ParcelQueryStatus, ParcelQueryType } from '@prisma/client';

const QUERY_CREATE_ROLES = [
  "managing-director",
  "supervisor",
  "dispatcher",
  "operations-officer",
  "customer-service-agent",
  "customer-service-director",
] as const;

const QUERY_MANAGE_ROLES = [
  "managing-director",
  "supervisor",
  "dispatcher",
  "operations-officer",
  "customer-service-agent",
  "customer-service-director",
] as const;

const QUERY_VIEW_ROLES = [
  "managing-director",
  "supervisor",
  "dispatcher",
  "operations-officer",
  "customer-service-agent",
  "customer-service-director",
  "cashier",
] as const;

const QUERY_REPORT_ROLES = [
  "managing-director",
  "customer-service-director",
  "operations-officer",
] as const;

@Controller('api/v1/parcel-queries')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ParcelQueriesController {
  constructor(private service: ParcelQueriesService) {}

  @Post('create')
  @SetMetadata('roles', QUERY_CREATE_ROLES)
  create(
    @Body() body: { parcelId: string; queryType: ParcelQueryType; description?: string },
    @Req() req: Request
  ) {
    if (!body?.parcelId || !body?.queryType) {
      throw new BadRequestException('Parcel ID and query type are required');
    }
    const createdBy = this.extractUserId(req);
    return this.service.create({
      parcelId: body.parcelId,
      queryType: body.queryType,
      description: body.description,
      createdBy,
    });
  }

  @Get('paginated')
  @SetMetadata('roles', QUERY_VIEW_ROLES)
  list(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: ParcelQueryStatus,
    @Query('parcelId') parcelId?: string,
  ) {
    return this.service.list(Number(page), Number(pageSize), status, parcelId);
  }

  @Get(':id')
  @SetMetadata('roles', QUERY_VIEW_ROLES)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/update-status')
  @SetMetadata('roles', QUERY_MANAGE_ROLES)
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ParcelQueryStatus; note?: string },
    @Req() req: Request
  ) {
    if (!body?.status) {
      throw new BadRequestException('Status is required');
    }
    const performedBy = this.extractUserId(req);
    return this.service.updateStatus(id, body.status, performedBy, body.note);
  }

  @Get(':id/events')
  @SetMetadata('roles', QUERY_VIEW_ROLES)
  events(@Param('id') id: string) {
    return this.service.getEvents(id);
  }

  @Get('report/summary')
  @SetMetadata('roles', QUERY_REPORT_ROLES)
  report(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.report(startDate, endDate);
  }

  private extractUserId(req: Request): string {
    const user: any = req?.user || {};
    const userId = user?.sub || user?.id || user?.userId;
    if (!userId) {
      throw new BadRequestException('User context missing');
    }
    return userId;
  }
}
