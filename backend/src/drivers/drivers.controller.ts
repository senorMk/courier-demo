import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata, Param, Put, Delete } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

const DRIVER_WRITE_ROLES = [
  'managing-director',
  'operations-officer',
  'dispatcher',
] as const;

const DRIVER_READ_ROLES = [
  ...DRIVER_WRITE_ROLES,
  'supervisor',
] as const;

@Controller('api/v1/drivers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DriversController {
  constructor(private service: DriversService) {}

  @Post()
  @SetMetadata('roles', DRIVER_WRITE_ROLES)
  create(@Body() body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    return this.service.create(body);
  }

  @Get('search')
  @SetMetadata('roles', DRIVER_READ_ROLES)
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('paginated')
  @SetMetadata('roles', DRIVER_READ_ROLES)
  paginated(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.service.paginated(Number(page), Number(pageSize));
  }

  @Get(':id')
  @SetMetadata('roles', DRIVER_READ_ROLES)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  @SetMetadata('roles', DRIVER_WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; phoneNumber?: string; licenseNumber?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @SetMetadata('roles', DRIVER_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
