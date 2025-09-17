import { Body, Controller, Get, Param, Post, Query, SetMetadata, UseGuards, BadRequestException } from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/v1/complaints')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class ComplaintsController {
  constructor(private service: ComplaintsService) {}

  @Post('damaged')
  fileDamaged(@Body() body: { code: string; reason?: string }) {
    if (!body?.code) {
      throw new BadRequestException('Tracking code is required');
    }
    return this.service.fileDamagedByCode(body.code.trim(), body.reason);
  }

  @Post('from-collected')
  fileFromCollected(@Body() body: { code: string; reason?: string }) {
    if (!body?.code) {
      throw new BadRequestException('Tracking code is required');
    }
    return this.service.fileFromCollectedByCode(body.code.trim(), body.reason);
  }

  @Get('paginated')
  list(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
    @Query('status') status?: 'OPEN' | 'CLOSED',
  ) {
    return this.service.list(Number(page), Number(pageSize), status as any);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: { note?: string }) {
    return this.service.close(id, body?.note);
  }

  @Get(':id/events')
  events(@Param('id') id: string) {
    return this.service.getEvents(id);
  }

  // Generic complaint logging (explicit button on parcel UI)
  @Post('log')
  log(@Body() body: { parcelId?: string; code?: string; reason?: string }) {
    return this.service.logGeneric(body);
  }

  // Report summary for dashboard (director)
  @Get('report/summary')
  report(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.report(startDate, endDate);
  }
}
