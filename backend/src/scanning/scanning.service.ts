import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ScanningService {
  constructor(private prisma: PrismaService) {}

  async startSession(
    userId: string,
    officeId: string,
    routeId: string,
    mode: "bag" | "individual"
  ) {
    // Basic validation: ensure office belongs to route
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
    });
    if (!office) throw new BadRequestException("Office not found");
    if (office.routeId !== routeId)
      throw new BadRequestException("Office not on selected route");

    const session = await this.prisma.scanningSession.create({
      data: {
        staffId: userId,
        officeId,
        routeId,
        mode,
        mailBagCode: mode === "bag" ? `MB-${Date.now()}` : null,
      },
    });
    return session;
  }

  async scanParcel(sessionId: string, parcelId: string, userId: string) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) throw new BadRequestException("Session closed");

    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { office: true },
    });
    if (!parcel) throw new BadRequestException("Parcel not found");
    // Validate route & office alignment
    if (parcel.office.routeId !== session.routeId) {
      throw new BadRequestException(`Parcel meant for a different route`);
    }
    if (parcel.officeId !== session.officeId) {
      throw new BadRequestException(`Parcel meant for another office`);
    }

    // Record scan (unique constraint prevents duplicates)
    const scan = await this.prisma.scannedParcel.create({
      data: {
        scanningSessionId: sessionId,
        parcelId,
        scannedById: userId,
      },
    });
    return scan;
  }

  async closeSession(sessionId: string) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { scans: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) return session;

    if (session.mode === "bag" && session.scans.length < 10) {
      throw new BadRequestException("Mail bag requires at least 10 parcels");
    }

    return this.prisma.scanningSession.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { scans: true },
    });
  }

  async getPaginatedSessions(
    page: number = 1,
    pageSize: number = 10,
    officeId?: string
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (officeId) where.officeId = officeId;
    const [sessions, total] = await this.prisma.$transaction([
      this.prisma.scanningSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.scanningSession.count({ where }),
    ]);
    return {
      data: sessions,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
