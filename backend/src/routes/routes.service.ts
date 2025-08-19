import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
// Define OfficeType as a string literal type matching your schema
type OfficeType = "BRANCH" | "AGENCY" | "OTHER"; // Replace with actual enum values from your schema

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async createRoute(data: { code: string; name: string }) {
    return this.prisma.route.create({ data });
  }

  async createOffice(data: {
    branchCode: string;
    officeType: "SENDING" | "RECEIVING";
    name: string;
  }) {
    return this.prisma.office.create({ data });
  }

  async createDestination(data: {
    code: string;
    branchCode: string;
    name: string;
    routeId: string;
  }) {
    return this.prisma.destination.create({ data });
  }

  async getDestinationsPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.destination.findMany({ skip, take: pageSize }),
      this.prisma.destination.count(),
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
}
