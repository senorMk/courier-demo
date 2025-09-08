import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OfficeType, Prisma } from "@prisma/client";
// Define OfficeType as a string literal type matching your schema

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async createRoute(data: { code: string; name: string }) {
    return this.prisma.route.create({ data });
  }

  async createOffice(data: {
    branchCode: string;
    officeTypes: OfficeType[]; // use Prisma enum array
    name: string;
    routeId: string;
  }) {
    return this.prisma.office.create({
      data: {
        branchCode: data.branchCode,
        officeTypes: data.officeTypes, // e.g., [OfficeType.SENDING, OfficeType.DISPATCH]
        name: data.name,
        route: { connect: { id: data.routeId } },
      },
    });
  }

  async getOfficesPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.office.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { route: { select: { id: true, name: true, code: true } } },
      }),
      this.prisma.office.count(),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getRoutesPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.route.findMany({ skip, take: pageSize }),
      this.prisma.route.count(),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Search offices by branch code, office type, or name
   * Limited to 50 results
   */
  async searchOffices(q: string) {
    return this.prisma.office.findMany({
      where: {
        OR: [
          { branchCode: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  }

  async searchRoutes(q: string) {
    return this.prisma.route.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });
  }

  async getOffice(id: string) {
    return this.prisma.office.findUnique({ where: { id } });
  }

  async updateOffice(
    id: string,
    data: Partial<{
      branchCode: string;
      officeTypes: OfficeType[];
      name: string;
      routeId: string;
    }>
  ) {
    const updateData: Prisma.OfficeUpdateInput = {};
    if (typeof data.branchCode !== 'undefined') updateData.branchCode = data.branchCode;
    if (typeof data.name !== 'undefined') updateData.name = data.name;
    if (typeof data.officeTypes !== 'undefined') updateData.officeTypes = data.officeTypes as any;
    if (typeof data.routeId !== 'undefined') updateData.route = { connect: { id: data.routeId } };
    return this.prisma.office.update({ where: { id }, data: updateData });
  }

  async deleteOffice(id: string) {
    return this.prisma.office.delete({ where: { id } });
  }
}
