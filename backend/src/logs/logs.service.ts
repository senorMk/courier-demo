import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async logLoginAttempt(email: string, success: boolean) {
    await this.prisma.accessLog.create({
      data: { email, action: 'login_attempt', success },
    });
  }

  async logAction(email: string, action: string) {
    await this.prisma.accessLog.create({
      data: { email, action, success: true },
    });
  }

  findAll() {
    return this.prisma.accessLog.findMany();
  }
}
