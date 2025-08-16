import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async logLoginAttempt(username: string, success: boolean) {
    await this.prisma.accessLog.create({
      data: { username, action: 'login_attempt', success },
    });
  }

  async logAction(username: string, action: string) {
    await this.prisma.accessLog.create({
      data: { username, action, success: true },
    });
  }

  findAll() {
    return this.prisma.accessLog.findMany();
  }
}
