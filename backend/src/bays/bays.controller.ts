import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SetMetadata } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { BaysService } from './bays.service';
import { CreateBayDto } from './dto/create-bay.dto';
import { UpdateBayDto } from './dto/update-bay.dto';

const ADMIN_ROLES = ['managing-director', 'supervisor', 'operations-officer'];

@Controller('api/v1/bays')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BaysController {
  constructor(private readonly baysService: BaysService) {}

  @Post()
  @SetMetadata('roles', ADMIN_ROLES)
  create(@Body() createBayDto: CreateBayDto) {
    return this.baysService.create(createBayDto);
  }

  @Get()
  findAll(@Query('officeId') officeId?: string) {
    return this.baysService.findAll(officeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.baysService.findOne(id);
  }

  @Get(':id/can-start-session')
  async canStartSession(@Param('id') id: string) {
    const canStart = await this.baysService.canStartNewSession(id);
    const activeCount = await this.baysService.getActiveSessionsCount(id);
    return {
      canStart,
      activeSessionsCount: activeCount,
      maxSessions: 2,
    };
  }

  @Patch(':id')
  @SetMetadata('roles', ADMIN_ROLES)
  update(@Param('id') id: string, @Body() updateBayDto: UpdateBayDto) {
    return this.baysService.update(id, updateBayDto);
  }

  @Delete(':id')
  @SetMetadata('roles', ADMIN_ROLES)
  remove(@Param('id') id: string) {
    return this.baysService.remove(id);
  }
}
