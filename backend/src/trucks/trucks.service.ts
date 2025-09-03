import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrucksService {
  constructor(private prisma: PrismaService) {}

  async create(body: { registration: string; make?: string; model?: string; capacity?: number }) {
    const reg = (body.registration || '').trim();
    if (!reg) throw new BadRequestException('Registration is required');
    return this.prisma.truck.create({ data: { registration: reg, make: body.make || null, model: body.model || null, capacity: (body as any).capacity ?? null } as any });
  }

  async search(q: string) {
    const query = (q || '').trim();
    if (!query) return [] as any[];
    return this.prisma.truck.findMany({
      where: {
        OR: [
          { registration: { contains: query, mode: 'insensitive' } },
          { make: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }
}

