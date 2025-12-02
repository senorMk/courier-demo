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

  async paginated(page = 1, pageSize = 10) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.truck.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.truck.count(),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return this.prisma.truck.findUnique({ where: { id } });
  }

  async update(
    id: string,
    body: { registration?: string; make?: string; model?: string; capacity?: number },
  ) {
    const data: any = {};
    if (body.registration !== undefined) data.registration = (body.registration || '').trim();
    if (body.make !== undefined) data.make = body.make || null;
    if (body.model !== undefined) data.model = body.model || null;
    if (body.capacity !== undefined) (data as any).capacity = body.capacity as any;
    if (!Object.keys(data).length) throw new BadRequestException('No fields to update');
    return this.prisma.truck.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.truck.delete({ where: { id } });
  }
}
