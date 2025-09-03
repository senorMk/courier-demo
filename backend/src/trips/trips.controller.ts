import { Body, Controller, Get, Param, Post, Put, UseGuards, Query } from '@nestjs/common';
import { TripsService } from './trips.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';

@Controller('api/v1/trips')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class TripsController {
  constructor(private service: TripsService) {}

  @Post()
  create(@Body() body: { routeId: string; officeId: string; driverName: string; truckReg: string; }) {
    return this.service.createTrip(body);
  }

  @Put(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() body: { driverName?: string; truckReg?: string }
  ) {
    return this.service.assignTrip(id, body);
  }

  @Put(':id/link-session/:sessionId')
  link(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.service.linkSession(id, sessionId);
  }

  @Post(':id/start')
  start(@Param('id') id: string) {
    return this.service.startTrip(id);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.service.completeTrip(id);
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.service.listTrips({ status, page: Number(page), pageSize: Number(pageSize) });
  }
}
