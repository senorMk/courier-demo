import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(username: string, password: string, role: Role) {
    return this.prisma.user.create({
      data: {
        username,
        password: await bcrypt.hash(password, 10),
        role,
      },
    });
  }

  findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}
