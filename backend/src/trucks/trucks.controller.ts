import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata, Param, Put, Delete } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

const TRUCK_WRITE_ROLES = [
  'managing-director',
  'operations-officer',
  'dispatcher',
] as const;

const TRUCK_READ_ROLES = [
  ...TRUCK_WRITE_ROLES,
  'supervisor',
] as const;

@Controller('api/v1/trucks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TrucksController {
  constructor(private service: TrucksService) {}

  @Post()
  @SetMetadata('roles', TRUCK_WRITE_ROLES)
  create(@Body() body: { registration: string; make?: string; model?: string; capacity?: number }) {
    return this.service.create(body);
  }

  @Get('search')
  @SetMetadata('roles', TRUCK_READ_ROLES)
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('paginated')
  @SetMetadata('roles', TRUCK_READ_ROLES)
  paginated(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.service.paginated(Number(page), Number(pageSize));
  }

  @Get(':id')
  @SetMetadata('roles', TRUCK_READ_ROLES)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  @SetMetadata('roles', TRUCK_WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Body() body: { registration?: string; make?: string; model?: string; capacity?: number },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @SetMetadata('roles', TRUCK_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
