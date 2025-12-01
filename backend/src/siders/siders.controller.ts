import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata, Param, Put, Delete } from '@nestjs/common';
import { SidersService } from './siders.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

const SIDER_WRITE_ROLES = [
  'managing-director',
  'operations-officer',
  'dispatcher',
] as const;

const SIDER_READ_ROLES = [
  ...SIDER_WRITE_ROLES,
  'supervisor',
] as const;

@Controller('api/v1/siders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SidersController {
  constructor(private service: SidersService) {}

  @Post()
  @SetMetadata('roles', SIDER_WRITE_ROLES)
  create(@Body() body: { firstName: string; lastName: string; phoneNumber?: string }) {
    return this.service.create(body);
  }

  @Get('search')
  @SetMetadata('roles', SIDER_READ_ROLES)
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  @Get('paginated')
  @SetMetadata('roles', SIDER_READ_ROLES)
  paginated(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.service.paginated(Number(page), Number(pageSize));
  }

  @Get(':id')
  @SetMetadata('roles', SIDER_READ_ROLES)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  @SetMetadata('roles', SIDER_WRITE_ROLES)
  update(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; phoneNumber?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @SetMetadata('roles', SIDER_WRITE_ROLES)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
