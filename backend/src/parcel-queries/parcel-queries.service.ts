import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ParcelQueryStatus, ParcelQueryType } from "@prisma/client";
import { TimeService } from "../common/time/time.service";

@Injectable()
export class ParcelQueriesService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
  ) { }

  private async logEvent(
    queryId: string,
    action: string,
    performedBy: string,
    from?: ParcelQueryStatus | null,
    to?: ParcelQueryStatus | null,
    note?: string | null
  ) {
    await this.prisma.parcelQueryEvent.create({
      data: {
        queryId,
        action,
        fromStatus: from ?? null,
        toStatus: to ?? null,
        note: note ?? null,
        performedBy,
      },
    });
  }

  async create(payload: {
    parcelId: string;
    queryType: ParcelQueryType;
    description?: string;
    createdBy: string;
  }) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: payload.parcelId },
    });
    if (!parcel) throw new NotFoundException("Parcel not found");

    const query = await this.prisma.parcelQuery.create({
      data: {
        parcelId: payload.parcelId,
        queryType: payload.queryType,
        description: payload.description || null,
        status: ParcelQueryStatus.OPEN,
        createdBy: payload.createdBy,
      },
      include: {
        parcel: {
          include: {
            TrackingCode: true,
            customer: true,
            receiver: true,
            office: true,
          },
        },
        creator: true,
      },
    });

    await this.logEvent(
      query.id,
      "CREATED",
      payload.createdBy,
      null,
      ParcelQueryStatus.OPEN,
      payload.description || "Query created"
    );

    return query;
  }

  async list(page = 1, pageSize = 10, status?: ParcelQueryStatus, parcelId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (parcelId) where.parcelId = parcelId;

    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.parcelQuery.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          parcel: {
            include: {
              TrackingCode: true,
              customer: true,
              receiver: true,
              office: true,
            },
          },
          creator: true,
        },
      }),
      this.prisma.parcelQuery.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string) {
    const query = await this.prisma.parcelQuery.findUnique({
      where: { id },
      include: {
        parcel: {
          include: {
            TrackingCode: true,
            customer: true,
            receiver: true,
            office: true,
          },
        },
        creator: true,
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!query) throw new NotFoundException("Query not found");
    return query;
  }

  async updateStatus(
    id: string,
    status: ParcelQueryStatus,
    performedBy: string,
    note?: string
  ) {
    const query = await this.prisma.parcelQuery.findUnique({
      where: { id },
    });

    if (!query) throw new NotFoundException("Query not found");

    const updated = await this.prisma.parcelQuery.update({
      where: { id },
      data: { status },
      include: {
        parcel: {
          include: {
            TrackingCode: true,
            customer: true,
            receiver: true,
            office: true,
          },
        },
        creator: true,
      },
    });

    await this.logEvent(
      id,
      this.getActionFromStatus(status),
      performedBy,
      query.status,
      status,
      note || `Status changed to ${status}`
    );

    return updated;
  }

  async getEvents(queryId: string) {
    const exists = await this.prisma.parcelQuery.findUnique({
      where: { id: queryId },
    });
    if (!exists) throw new NotFoundException("Query not found");

    return this.prisma.parcelQueryEvent.findMany({
      where: { queryId },
      orderBy: { createdAt: "asc" },
    });
  }

  async report(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      try {
        if (startDate) where.createdAt.gte = this.time.parse(startDate);
        if (endDate) where.createdAt.lte = this.time.parse(endDate);
      } catch {
        throw new BadRequestException("Invalid date range supplied");
      }
    }

    const [openCount, inProgressCount, resolvedCount, closedCount, all] = await this.prisma.$transaction([
      this.prisma.parcelQuery.count({ where: { ...where, status: ParcelQueryStatus.OPEN } }),
      this.prisma.parcelQuery.count({ where: { ...where, status: ParcelQueryStatus.IN_PROGRESS } }),
      this.prisma.parcelQuery.count({ where: { ...where, status: ParcelQueryStatus.RESOLVED } }),
      this.prisma.parcelQuery.count({ where: { ...where, status: ParcelQueryStatus.CLOSED } }),
      this.prisma.parcelQuery.count({ where }),
    ]);

    return {
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      closed: closedCount,
      total: all,
    };
  }

  private getActionFromStatus(status: ParcelQueryStatus): string {
    switch (status) {
      case ParcelQueryStatus.IN_PROGRESS:
        return "STARTED_INVESTIGATION";
      case ParcelQueryStatus.RESOLVED:
        return "RESOLVED";
      case ParcelQueryStatus.CLOSED:
        return "CLOSED";
      default:
        return "STATUS_CHANGED";
    }
  }
}
