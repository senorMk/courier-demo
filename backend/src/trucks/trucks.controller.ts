import { Controller, Get, Post, Body, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('api/v1/trucks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class TrucksController {
  constructor(private service: TrucksService) {}

  @Post()
  create(@Body() body: { registration: string; make?: string; model?: string; capacity?: number }) {
    return this.service.create(body);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }
}

