import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SidersService {
  constructor(private prisma: PrismaService) {}

  async create(body: { firstName: string; lastName: string; phoneNumber?: string }) {
    if (!body.firstName || !body.lastName) throw new BadRequestException('First and last name required');
    return this.prisma.sider.create({ data: body });
  }

  async search(q: string) {
    const query = (q || '').trim();
    if (!query) return [] as any[];
    return this.prisma.sider.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phoneNumber: { contains: query, mode: 'insensitive' } },
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
      this.prisma.sider.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.sider.count(),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return this.prisma.sider.findUnique({ where: { id } });
  }

  async update(
    id: string,
    body: { firstName?: string; lastName?: string; phoneNumber?: string },
  ) {
    const data: any = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phoneNumber !== undefined) data.phoneNumber = body.phoneNumber;
    if (!Object.keys(data).length) throw new BadRequestException('No fields to update');
    return this.prisma.sider.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.sider.delete({ where: { id } });
  }
}
