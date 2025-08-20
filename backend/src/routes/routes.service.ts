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
    officeType: OfficeType; // use Prisma enum
    name: string;
    routeId: string;
  }) {
    return this.prisma.office.create({
      data: {
        branchCode: data.branchCode,
        officeType: data.officeType, // must be OfficeType.SENDING etc.
        name: data.name,
        route: { connect: { id: data.routeId } },
      },
    });
  }

  async getOfficesPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.office.findMany({ skip, take: pageSize }),
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
}
