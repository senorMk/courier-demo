import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/v1/drivers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class DriversController {
  constructor(private service: DriversService) {}

  @Post()
  create(@Body() body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    return this.service.create(body);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }
}

