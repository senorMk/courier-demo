import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OfficeType, Prisma } from "@prisma/client";
import { TimeService } from "../common/time/time.service";
// Define OfficeType as a string literal type matching your schema

@Injectable()
export class RoutesService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
  ) {}

  private mapOfficeForResponse(office: any) {
    if (!office) {
      return office;
    }
    return {
      ...office,
      createdAt: this.time.toISO(office.createdAt),
      updatedAt: this.time.toISO(office.updatedAt),
    };
  }

  async createRoute(data: { code: string; name: string }) {
    return this.prisma.route.create({ data });
  }

  async createOffice(data: {
    branchCode: string;
    areaCode?: string;
    officeTypes: OfficeType[]; // use Prisma enum array
    name: string;
    routeId: string;
  }) {
    const office = await this.prisma.office.create({
      data: ({
        branchCode: data.branchCode,
        areaCode: data.areaCode || null,
        officeTypes: data.officeTypes, // e.g., [OfficeType.SENDING, OfficeType.DISPATCH]
        name: data.name,
        route: { connect: { id: data.routeId } },
      } as any),
    });
    return this.mapOfficeForResponse(office);
  }

  async getOfficesPaginated(page: number = 1, pageSize: number = 10, search?: string) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const where: Prisma.OfficeWhereInput | undefined = search
      ? {
          OR: [
            { branchCode: { contains: search, mode: "insensitive" } },
            { areaCode: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            {
              route: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { code: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          ],
        }
      : undefined;
    const [offices, total] = await Promise.all([
      this.prisma.office.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { route: { select: { id: true, name: true, code: true } } },
        where,
      }),
      this.prisma.office.count({ where }),
    ]);
    const data = offices.map((office) => this.mapOfficeForResponse(office));
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
   * Limited to 50 results. If no query provided, returns all offices.
   */
  async searchOffices(q?: string) {
    const where: any = q && q.trim() ? {
      OR: [
        { branchCode: { contains: q, mode: "insensitive" } },
        { areaCode: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        {
          route: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ],
    } : {};
    const offices = await this.prisma.office.findMany({
      where,
      take: 200,
      orderBy: { name: "asc" },
      include: { route: { select: { id: true, name: true, code: true } } },
    });
    return offices.map((office) => this.mapOfficeForResponse(office));
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
    const office = await this.prisma.office.findUnique({
      where: { id },
      include: { route: { select: { id: true, name: true, code: true } } },
    });
    return this.mapOfficeForResponse(office);
  }

  async updateOffice(
    id: string,
    data: Partial<{
      branchCode: string;
      areaCode: string;
      officeTypes: OfficeType[];
      name: string;
      routeId: string;
    }>
  ) {
  const updateData: Prisma.OfficeUpdateInput = {};
    if (typeof data.branchCode !== 'undefined') updateData.branchCode = data.branchCode;
  if (typeof data.areaCode !== 'undefined') (updateData as any).areaCode = data.areaCode;
    if (typeof data.name !== 'undefined') updateData.name = data.name;
    if (typeof data.officeTypes !== 'undefined') updateData.officeTypes = data.officeTypes as any;
    if (typeof data.routeId !== 'undefined') updateData.route = { connect: { id: data.routeId } };
    const office = await this.prisma.office.update({ where: { id }, data: updateData, include: { route: { select: { id: true, name: true, code: true } } } });
    return this.mapOfficeForResponse(office);
  }

  async deleteOffice(id: string) {
    const office = await this.prisma.office.delete({ where: { id } });
    return this.mapOfficeForResponse(office);
  }
}
