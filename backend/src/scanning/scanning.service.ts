import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, ParcelStatus } from "@prisma/client";
import { sendSms } from "../utils/sms-sender";
import { generateDeliveryNote } from "../utils/delivery-note-generator";

@Injectable()
export class ScanningService {
  constructor(private prisma: PrismaService) {}

  private normalizeZMBPhone(msisdn?: string): string {
    if (!msisdn) return "";
    const digits = String(msisdn).replace(/\D/g, "");
    if (digits.startsWith("260")) return `+${digits}`;
    if (digits.startsWith("0")) return `+260${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("9")) return `+260${digits}`;
    return `+${digits}`;
  }

  async startSession(
    userId: string,
    officeId: string,
    routeId: string,
    mode: "bag" | "individual",
    tripId?: string
  ) {
    // Basic validation: ensure office belongs to route
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
    });
    if (!office) throw new BadRequestException("Office not found");
    if (office.routeId !== routeId) {
      // TODO: Clarify with PM - temporarily disabled to allow cross-route scanning
      throw new BadRequestException("Office not on selected route");
    }

    // Dispatch scanner: require a trip and ensure it is loadable
    if (
      Array.isArray((office as any).officeTypes) &&
      (office as any).officeTypes.includes("DISPATCH")
    ) {
      if (!tripId) {
        throw new BadRequestException(
          "Dispatch scanning requires an active trip"
        );
      }
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new BadRequestException("Trip not found");
      if (trip.routeId !== routeId || trip.officeId !== officeId) {
        throw new BadRequestException("Trip does not match route/office");
      }
      if (trip.status === "IN_TRANSIT" || trip.status === "COMPLETED") {
        throw new BadRequestException("Trip already departed or completed");
      }
    }

    // Validate trip linkage if provided
    if (tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new BadRequestException("Trip not found");
      if (trip.routeId !== routeId || trip.officeId !== officeId) {
        throw new BadRequestException("Trip does not match route/office");
      }
    }

    const session = await this.prisma.scanningSession.create({
      data: {
        staffId: userId,
        officeId,
        routeId,
        mode,
        tripId: tripId || null,
        mailBagCode: mode === "bag" ? `MB-${Date.now()}` : null,
      },
    });
    return session;
  }

  async scanParcel(sessionId: string, code: string, userId: string) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { office: true, trip: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) throw new BadRequestException("Session closed");

    // Dispatch scanner: must be tied to a loadable trip
    if (
      Array.isArray((session.office as any)?.officeTypes) &&
      (session.office as any).officeTypes.includes("DISPATCH")
    ) {
      if (!session.trip)
        throw new BadRequestException(
          "Dispatch session must be linked to a trip"
        );
      if (
        session.trip.status === "IN_TRANSIT" ||
        session.trip.status === "COMPLETED"
      ) {
        throw new BadRequestException("Cannot scan after trip departure");
      }
    }

    // Look up parcel via plain text tracking code
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: {
        parcel: {
          include: {
            office: true,
            TrackingCode: true,
            customer: true,
            receiver: true,
          },
        },
      },
    });
    if (!tracking || !tracking.parcel) {
      throw new BadRequestException("Invalid tracking code");
    }
    const parcel = tracking.parcel;
    // Validate route & office alignment
    const correctDest = `${parcel.office.name} (${parcel.office.branchCode})`;
    const currentOffice = session.office
      ? `${session.office.name} (${session.office.branchCode})`
      : "current office";
    if (parcel.office.routeId !== session.routeId) {
      throw new BadRequestException(
        `Parcel meant for ${correctDest}, not ${currentOffice}.`
      );
    }
    // Receiving-office offload: enforce correct office
    if (
      session.office &&
      Array.isArray((session.office as any).officeTypes) &&
      (session.office as any).officeTypes.includes("RECEIVING")
    ) {
      if (parcel.officeId !== session.officeId) {
        throw new BadRequestException(
          `Parcel meant for ${correctDest}, not ${currentOffice}.`
        );
      }
    }

    // Record scan (unique constraint prevents duplicates)
    try {
      // Prevent duplicates: already scanned within same logical scope
      // 1) If session is tied to a trip, ensure parcel not already scanned for the same trip
      if (session.tripId) {
        const dupTrip = await this.prisma.scannedParcel.findFirst({
          where: {
            parcelId: parcel.id,
            scanningSession: { tripId: session.tripId },
          },
        });
        if (dupTrip)
          throw new BadRequestException("Parcel already scanned for this trip");
      }
      // 2) If receiving office, ensure not already scanned at this office
      if (
        session.office &&
        Array.isArray((session.office as any).officeTypes) &&
        (session.office as any).officeTypes.includes("RECEIVING")
      ) {
        const dupOffice = await this.prisma.scannedParcel.findFirst({
          where: {
            parcelId: parcel.id,
            scanningSession: { officeId: session.officeId },
          },
        });
        if (dupOffice)
          throw new BadRequestException(
            "Parcel already scanned at this office"
          );
      }
      // 3) Always block duplicate within the same session (defensive in case DB constraint missing)
      const dupSession = await this.prisma.scannedParcel.findUnique({
        where: {
          scanningSessionId_parcelId: {
            scanningSessionId: sessionId,
            parcelId: parcel.id,
          },
        },
      });
      if (dupSession)
        throw new BadRequestException("Parcel already scanned in this session");
      const scan = await this.prisma.scannedParcel.create({
        data: {
          scanningSessionId: sessionId,
          parcelId: parcel.id,
          scannedById: userId,
        },
      });
      // If linked to a trip and trip is PLANNED, flip to LOADING
      if (session.trip && session.trip.status === "PLANNED") {
        await this.prisma.trip.update({
          where: { id: session.trip.id },
          data: { status: "LOADING" as any },
        });
      }
      // Receiving offload: mark ready for collection and send SMS
      if (
        session.office &&
        Array.isArray((session.office as any).officeTypes) &&
        (session.office as any).officeTypes.includes("RECEIVING") &&
        parcel.officeId === session.officeId
      ) {
        await this.prisma.parcel.update({
          where: { id: parcel.id },
          data: { status: ParcelStatus.READY_FOR_COLLECTION },
        });
        try {
          const codeTxt = parcel.TrackingCode?.plainTextCode || parcel.id;
          const dest = `${parcel.office.name} (${parcel.office.branchCode})`;
          const msgReceiver = `PCS: Parcel ${codeTxt} is ready for collection at ${dest}.`;
          const msgSender = `PCS: Your parcel ${codeTxt} is ready for collection at ${dest}.`;
          if (parcel.receiver?.phoneNumber)
            await sendSms(
              this.normalizeZMBPhone(parcel.receiver.phoneNumber as any),
              msgReceiver
            );
          if (parcel.customer?.phoneNumber)
            await sendSms(
              this.normalizeZMBPhone(parcel.customer.phoneNumber as any),
              msgSender
            );
        } catch (e) {
          // Best effort
        }
      }
      return scan;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("Parcel already scanned");
      }
      throw e;
    }
  }

  // Legacy: scan by parcelId (kept for backward compatibility)
  async scanParcelByParcelId(
    sessionId: string,
    parcelId: string,
    userId: string
  ) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { office: true, trip: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) throw new BadRequestException("Session closed");

    if (
      Array.isArray((session.office as any)?.officeTypes) &&
      (session.office as any).officeTypes.includes("DISPATCH")
    ) {
      if (!session.trip)
        throw new BadRequestException(
          "Dispatch session must be linked to a trip"
        );
      if (
        session.trip.status === "IN_TRANSIT" ||
        session.trip.status === "COMPLETED"
      ) {
        throw new BadRequestException("Cannot scan after trip departure");
      }
    }

    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        office: true,
        TrackingCode: true,
        customer: true,
        receiver: true,
      },
    });
    if (!parcel) throw new BadRequestException("Parcel not found");
    const correctDest2 = `${parcel.office.name} (${parcel.office.branchCode})`;
    const currentOffice2 = session.office
      ? `${session.office.name} (${session.office.branchCode})`
      : "current office";
    if (parcel.office.routeId !== session.routeId) {
      throw new BadRequestException(
        `Parcel meant for ${correctDest2}, not ${currentOffice2}.`
      );
    }
    if (
      session.office &&
      Array.isArray((session.office as any).officeTypes) &&
      (session.office as any).officeTypes.includes("RECEIVING")
    ) {
      if (parcel.officeId !== session.officeId) {
        throw new BadRequestException(
          `Parcel meant for ${correctDest2}, not ${currentOffice2}.`
        );
      }
    }

    try {
      // Prevent duplicates: per trip and per receiving office
      if (session.tripId) {
        const dupTrip = await this.prisma.scannedParcel.findFirst({
          where: { parcelId, scanningSession: { tripId: session.tripId } },
        });
        if (dupTrip)
          throw new BadRequestException("Parcel already scanned for this trip");
      }
      if (
        session.office &&
        Array.isArray((session.office as any).officeTypes) &&
        (session.office as any).officeTypes.includes("RECEIVING")
      ) {
        const dupOffice = await this.prisma.scannedParcel.findFirst({
          where: { parcelId, scanningSession: { officeId: session.officeId } },
        });
        if (dupOffice)
          throw new BadRequestException(
            "Parcel already scanned at this office"
          );
      }
      const dupSession = await this.prisma.scannedParcel.findUnique({
        where: {
          scanningSessionId_parcelId: {
            scanningSessionId: sessionId,
            parcelId,
          },
        },
      });
      if (dupSession)
        throw new BadRequestException("Parcel already scanned in this session");
      const created = await this.prisma.scannedParcel.create({
        data: { scanningSessionId: sessionId, parcelId, scannedById: userId },
      });
      if (session.trip && session.trip.status === "PLANNED") {
        await this.prisma.trip.update({
          where: { id: session.trip.id },
          data: { status: "LOADING" as any },
        });
      }
      if (
        session.office &&
        Array.isArray((session.office as any).officeTypes) &&
        (session.office as any).officeTypes.includes("RECEIVING") &&
        parcel.officeId === session.officeId
      ) {
        await this.prisma.parcel.update({
          where: { id: parcel.id },
          data: { status: ParcelStatus.READY_FOR_COLLECTION },
        });
        try {
          const codeTxt = parcel.TrackingCode?.plainTextCode || parcel.id;
          const dest = `${parcel.office.name} (${parcel.office.branchCode})`;
          const msgReceiver = `PCS: Parcel ${codeTxt} is ready for collection at ${dest}.`;
          const msgSender = `PCS: Your parcel ${codeTxt} is ready for collection at ${dest}.`;
          if (parcel.receiver?.phoneNumber)
            await sendSms(
              this.normalizeZMBPhone(parcel.receiver.phoneNumber as any),
              msgReceiver
            );
          if (parcel.customer?.phoneNumber)
            await sendSms(
              this.normalizeZMBPhone(parcel.customer.phoneNumber as any),
              msgSender
            );
        } catch (e) {}
      }
      return created;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        throw new BadRequestException("Parcel already scanned");
      }
      throw e;
    }
  }

  async closeSession(sessionId: string) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { scans: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) return session;

    if (session.mode === "bag" && session.scans.length < 1) {
      throw new BadRequestException("Mail bag requires at least 10 parcels");
    }

    const closed = await this.prisma.scanningSession.update({
      where: { id: sessionId },
      data: { closedAt: new Date() },
    });

    // Generate delivery note PDF once on close (no-op if already exists)
    try {
      await generateDeliveryNote(sessionId, { force: false });
    } catch (e) {
      // Log and continue; closing should not fail due to PDF issues
      console.error(
        "Failed to generate delivery note on close:",
        e?.message || e
      );
    }

    return closed;
  }

  async getSession(sessionId: string) {
    return this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        route: { select: { id: true, name: true, code: true } },
        office: { select: { id: true, name: true, branchCode: true } },
        scans: {
          include: {
            scannedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            parcel: {
              include: {
                TrackingCode: true,
                office: { select: { name: true, branchCode: true } },
              },
            },
          },
          orderBy: { scannedAt: "desc" },
        },
      },
    });
  }

  async getPaginatedSessions(
    page: number = 1,
    pageSize: number = 10,
    officeId?: string
  ) {
    try {
      const skip = (page - 1) * pageSize;
      const where: any = {};
      if (officeId) where.officeId = officeId;

      const [sessions, total] = await this.prisma.$transaction([
        this.prisma.scanningSession.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            office: { select: { id: true, name: true, branchCode: true } },
            route: { select: { id: true, name: true, code: true } },
            _count: { select: { scans: true } },
          },
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
    } catch (exception) {
      console.error("Failed to fetch paginated sessions", exception);
      throw new InternalServerErrorException(
        "Failed to fetch paginated sessions"
      );
    }
  }

  async getPaginatedScans(
    page: number = 1,
    pageSize: number = 10,
    officeId?: string
  ) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (officeId) {
      // Filter by session office
      where.scanningSession = { officeId };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.scannedParcel.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scannedAt: "desc" },
        include: {
          scanningSession: {
            select: { id: true, officeId: true, routeId: true, mode: true },
          },
          scannedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          parcel: {
            include: {
              TrackingCode: true,
              office: { select: { id: true, name: true, branchCode: true } },
            },
          },
        },
      }),
      this.prisma.scannedParcel.count({ where }),
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
