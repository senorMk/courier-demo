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

  async paginated(page = 1, pageSize = 10) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.max(1, Math.min(100, Number(pageSize) || 10));
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({ orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.driver.count(),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async update(
    id: string,
    body: { firstName?: string; lastName?: string; phoneNumber?: string; licenseNumber?: string },
  ) {
    const data: any = {};
    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phoneNumber !== undefined) data.phoneNumber = body.phoneNumber;
    if (body.licenseNumber !== undefined) data.licenseNumber = body.licenseNumber;
    if (!Object.keys(data).length) throw new BadRequestException('No fields to update');
    return this.prisma.driver.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.driver.delete({ where: { id } });
  }
}
