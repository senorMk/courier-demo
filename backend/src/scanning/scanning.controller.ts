import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ScanningService } from './scanning.service';
import { Request } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMetadata } from '@nestjs/common';
import { Req } from '@nestjs/common';

interface JwtUser {
  sub: string;
  officeId?: string;
  role: string;
}

@Controller('api/v1/scanning')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@SetMetadata('roles', ['managing-director'])
export class ScanningController {
  constructor(private service: ScanningService) {}

  @Post('start')
  async start(@Req() req: Request, @Body() body: { routeId: string; officeId?: string; mode: 'bag' | 'individual'; staffId?: string }) {
    const user = req.user as JwtUser;
    const officeId = body.officeId || user.officeId;
    if (!officeId) throw new Error('Office context required');
    const staffId = body.staffId || user.sub;
    return this.service.startSession(staffId, officeId, body.routeId, body.mode);
  }

  @Post(':id/scan')
  async scan(@Req() req: Request, @Param('id') id: string, @Body() body: { parcelId: string }) {
    const user = req.user as JwtUser;
    return this.service.scanParcel(id, body.parcelId, user.sub);
  }

  @Post(':id/close')
  async close(@Param('id') id: string) {
    return this.service.closeSession(id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getSession(id);
  }
}
