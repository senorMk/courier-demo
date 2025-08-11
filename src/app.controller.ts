import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { Roles } from './auth/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { LogsService } from './logs/logs.service';

@Controller('api/v1')
export class AppController {
  constructor(private logs: LogsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MD)
  @Get('md')
  getMD(@Request() req) {
    this.logs.logAction(req.user.username, 'md_resource');
    return 'MD resource';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Branch)
  @Get('branch')
  getBranch(@Request() req) {
    this.logs.logAction(req.user.username, 'branch_resource');
    return 'Branch resource';
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Finance)
  @Get('finance')
  getFinance(@Request() req) {
    this.logs.logAction(req.user.username, 'finance_resource');
    return 'Finance resource';
  }
}
