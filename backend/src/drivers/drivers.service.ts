import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async create(body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    if (!body.firstName || !body.lastName) throw new BadRequestException('First and last name required');
    return this.prisma.driver.create({ data: body });
  }

  async search(q: string) {
    const query = (q || '').trim();
    if (!query) return [] as any[];
    return this.prisma.driver.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query, mode: 'insensitive' } },
          { licenseNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}

