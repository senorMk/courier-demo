import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, ParcelStatus } from "@prisma/client";
import { sendSms } from "../utils/sms-sender";
import { normalizeZMBPhone } from "../utils/phone.util";
import { generateDeliveryNote } from "../utils/delivery-note-generator";
import { TimeService } from "../common/time/time.service";

@Injectable()
export class ScanningService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
  ) { }

  async startSession(
    userId: string,
    officeId: string,
    routeId: string,
    mode: "bag" | "individual",
    tripId?: string,
    bayId?: string
  ) {
    // Basic validation: ensure office belongs to route
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
    });
    if (!office) throw new BadRequestException("Office not found");
    if (office.routeId !== routeId) {
      // TODO: Clarify with PM - temporarily disabled to allow cross-route scanning
      // throw new BadRequestException("Office not on selected route");
    }

    // Validate bay if provided
    let bay: any = null;
    if (bayId) {
      bay = await this.prisma.bay.findUnique({
        where: { id: bayId },
      });
      if (!bay) throw new BadRequestException("Bay not found");
      if (bay.officeId !== officeId) {
        throw new BadRequestException("Bay does not belong to this office");
      }
      if (!bay.active) {
        throw new BadRequestException("Bay is not active");
      }

      // Check if user is authorized for this bay type
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { authorizedBayTypes: true },
      });

      if (
        user &&
        Array.isArray(user.authorizedBayTypes) &&
        user.authorizedBayTypes.length > 0 &&
        !(user.authorizedBayTypes as any[]).includes(bay.bayType)
      ) {
        throw new BadRequestException(
          `You are not authorized to work in ${bay.bayType} bay`
        );
      }

      // Check if bay can start a new session (max 2 active sessions)
      const activeSessionsCount = await this.prisma.scanningSession.count({
        where: {
          bayId,
          closedAt: null,
        },
      });

      if (activeSessionsCount >= 2) {
        throw new BadRequestException(
          "Bay already has 2 active sessions. Please close one before starting a new session."
        );
      }

      // Dispatch bay scanner: require a trip and ensure it is loadable
      // Only require trip if scanning from a DISPATCH bay, not for SENDING bay (which is just recording parcels)
      if (bay.bayType === "DISPATCH") {
        if (!tripId) {
          throw new BadRequestException(
            "Dispatch bay scanning requires an active trip. SENDING bay operations do not need a trip."
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
    }

    // Validate trip linkage if provided
    if (tripId) {
      const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) throw new BadRequestException("Trip not found");

      // For RECEIVING bay, validate against destination office; for DISPATCH, validate against origin office
      const isReceivingBay = bay?.bayType === "RECEIVING";
      const officeMatch = isReceivingBay
        ? trip.destinationOfficeId === officeId
        : trip.officeId === officeId;

      if (trip.routeId !== routeId || !officeMatch) {
        throw new BadRequestException("Trip does not match route/office");
      }
    }

    const session = await this.prisma.scanningSession.create({
      data: {
        staffId: userId,
        officeId,
        routeId,
        mode,
        bayId: bayId || null,
        tripId: tripId || null,
        mailBagCode: mode === "bag" ? `MB-${this.time.now().getTime()}` : null,
      },
    });
    return session;
  }

  async scanParcel(sessionId: string, code: string, userId: string) {
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { office: true, trip: true, bay: true },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.closedAt) throw new BadRequestException("Session closed");

    const bayType = session.bay?.bayType;
    const officeIsDispatch = Array.isArray((session.office as any)?.officeTypes) &&
      (session.office as any).officeTypes.includes("DISPATCH");

    // Only enforce the trip requirement if this session is associated with a dispatch bay.
    // SENDING bay operations may happen inside the same office but do not require a trip.
    if (bayType === "DISPATCH") {
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
    } else if (!session.bay && officeIsDispatch && session.trip) {
      // Legacy sessions created against a dispatch office without explicit bay still need trip validation
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
    const officeTypes = Array.isArray((session.office as any)?.officeTypes)
      ? (session.office as any).officeTypes
      : [];
    const isSendingContext = bayType === "SENDING" || (!bayType && officeTypes.includes("SENDING"));
    const correctDest = `${parcel.office.name} (${parcel.office.branchCode})`;
    const currentOffice = session.office
      ? `${session.office.name} (${session.office.branchCode})`
      : "current office";

    // Route validation is skipped for sending bays so parcels can simply be logged.
    if (!isSendingContext && parcel.office.routeId !== session.routeId) {
      throw new BadRequestException(
        `Parcel meant for ${correctDest}, not ${currentOffice}.`
      );
    }

    // Receiving bay validation: enforce correct office (other bay types are exempt)
    const isReceivingBay = session.bay?.bayType === "RECEIVING";
    if (!isSendingContext && session.office && isReceivingBay) {
      if (parcel.officeId !== session.officeId) {
        throw new BadRequestException(
          `Parcel meant for ${correctDest}, not ${currentOffice}.`
        );
      }
    }

    // Receiver validation: If receiving bay has a trip selected, validate parcel against trip manifest
    if (isReceivingBay && session.tripId) {
      // Check if parcel was scanned in a dispatch session linked to this trip
      const parcelInManifest = await this.prisma.scannedParcel.findFirst({
        where: {
          parcelId: parcel.id,
          scanningSession: { tripId: session.tripId },
        },
      });
      if (!parcelInManifest) {
        const code = parcel.TrackingCode?.plainTextCode || parcel.id;
        throw new BadRequestException(
          `Parcel ${code} is not on this trip's manifest. Please verify the driver and truck selection.`
        );
      }
    }

    // Record scan (unique constraint prevents duplicates)
    try {
      // Prevent duplicates: already scanned within same logical scope
      // 1) If session is tied to a trip, ensure parcel not already scanned for the same trip
      // Exception: Receiving bays can scan parcels that were dispatched (for validation)
      if (session.tripId && !isReceivingBay) {
        const dupTrip = await this.prisma.scannedParcel.findFirst({
          where: {
            parcelId: parcel.id,
            scanningSession: { tripId: session.tripId },
          },
        });
        if (dupTrip)
          throw new BadRequestException("Parcel already scanned for this trip");
      }
      // For receiving bays: prevent scanning the same parcel twice in receiving sessions for the same trip
      if (session.tripId && isReceivingBay) {
        const dupReceiving = await this.prisma.scannedParcel.findFirst({
          where: {
            parcelId: parcel.id,
            scanningSession: {
              tripId: session.tripId,
              bay: { bayType: "RECEIVING" as any },
            },
          },
        });
        if (dupReceiving)
          throw new BadRequestException("Parcel already received and scanned for this trip");
      }
      // 2) Always block duplicate within the same session (defensive in case DB constraint missing)
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
      // Receiving bay: mark ready for collection and send SMS
      if (
        session.bay?.bayType === "RECEIVING" &&
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
          if (parcel.receiver?.phoneNumber) {
            const msisdn = normalizeZMBPhone(parcel.receiver.phoneNumber as any);
            if (msisdn) await sendSms(msisdn, msgReceiver);
          }
          if (parcel.customer?.phoneNumber) {
            const msisdn = normalizeZMBPhone(parcel.customer.phoneNumber as any);
            if (msisdn) await sendSms(msisdn, msgSender);
          }
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
      include: { office: true, trip: true, bay: true },
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
    if (session.bay?.bayType === "RECEIVING") {
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
      if (session.bay?.bayType === "RECEIVING") {
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
        session.bay?.bayType === "RECEIVING" &&
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
          if (parcel.receiver?.phoneNumber) {
            const msisdn = normalizeZMBPhone(parcel.receiver.phoneNumber as any);
            if (msisdn) await sendSms(msisdn, msgReceiver);
          }
          if (parcel.customer?.phoneNumber) {
            const msisdn = normalizeZMBPhone(parcel.customer.phoneNumber as any);
            if (msisdn) await sendSms(msisdn, msgSender);
          }
        } catch (e) { }
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
      data: { closedAt: this.time.now() },
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
        bay: {
          select: {
            id: true,
            name: true,
            bayType: true,
          },
        },
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
            bay: {
              select: {
                id: true,
                name: true,
                bayType: true,
              },
            },
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

  async deleteSession(sessionId: string) {
    // First check if session exists
    const session = await this.prisma.scanningSession.findUnique({
      where: { id: sessionId },
      include: { scans: true },
    });

    if (!session) {
      throw new NotFoundException("Scanning session not found");
    }

    // Only allow deletion of draft sessions (not closed)
    if (session.closedAt) {
      throw new BadRequestException("Cannot delete a closed session");
    }

    // Delete all associated scans first, then the session
    await this.prisma.$transaction([
      this.prisma.scannedParcel.deleteMany({
        where: { scanningSessionId: sessionId },
      }),
      this.prisma.scanningSession.delete({
        where: { id: sessionId },
      }),
    ]);

    return { message: "Session deleted successfully" };
  }
}
