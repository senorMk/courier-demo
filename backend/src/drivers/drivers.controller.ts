import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata, Param, Put, Delete } from '@nestjs/common';
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

  @Get('paginated')
  paginated(@Query('page') page = 1, @Query('pageSize') pageSize = 10) {
    return this.service.paginated(Number(page), Number(pageSize));
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { firstName?: string; lastName?: string; phoneNumber?: string; licenseNumber?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
