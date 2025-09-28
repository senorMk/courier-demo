import { Body, Controller, Get, Param, Post, Put, UseGuards, Query, Req } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';

const TRIP_MANAGE_ROLES = [
  'managing-director',
  'operations-officer',
  'dispatcher',
  'supervisor',
] as const;

const TRIP_EXECUTION_ROLES = [
  ...TRIP_MANAGE_ROLES,
  'driver',
  'assistant-driver',
] as const;

@Controller('api/v1/trips')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TripsController {
  constructor(private service: TripsService) {}

  @Post()
  @SetMetadata('roles', TRIP_MANAGE_ROLES)
  create(@Body() body: { routeId: string; officeId: string; driverName: string; truckReg: string; }) {
    return this.service.createTrip(body);
  }

  @Put(':id/assign')
  @SetMetadata('roles', TRIP_MANAGE_ROLES)
  assign(
    @Param('id') id: string,
    @Body() body: { driverName?: string; truckReg?: string }
  ) {
    return this.service.assignTrip(id, body);
  }

  @Put(':id/link-session/:sessionId')
  @SetMetadata('roles', TRIP_MANAGE_ROLES)
  link(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.service.linkSession(id, sessionId);
  }

  @Post(':id/start')
  @SetMetadata('roles', TRIP_MANAGE_ROLES)
  start(@Param('id') id: string) {
    return this.service.startTrip(id);
  }

  @Post(':id/complete')
  @SetMetadata('roles', TRIP_MANAGE_ROLES)
  complete(@Param('id') id: string) {
    return this.service.completeTrip(id);
  }

  @Get()
  @SetMetadata('roles', TRIP_EXECUTION_ROLES)
  list(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.service.listTrips({ status, page: Number(page), pageSize: Number(pageSize) });
  }

  @Get('open')
  @SetMetadata('roles', TRIP_EXECUTION_ROLES)
  open(
    @Req() req: Request,
    @Query('routeId') routeId: string,
  ) {
    const user: any = (req as any).user || {};
    const officeId = user?.officeId;
    return this.service.openTrips(routeId, officeId);
  }
}
