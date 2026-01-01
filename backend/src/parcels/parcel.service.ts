import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Office, Parcel, ParcelStatus } from "@prisma/client";
import { generateBarcodeForId } from "../utils/barcode-generator";
import { generateReceiptsForParcel } from "../utils/receipt-generator";
import { sendTemplateSms } from '../utils/sms-sender';
import { SmsTemplates } from '../config/sms-templates';
import { normalizeZMBPhone } from "../utils/phone.util";
import { TimeService } from "../common/time/time.service";
import { SystemSettingsService } from "../system-settings/system-settings.service";

@Injectable()
export class ParcelService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
    private readonly systemSettings: SystemSettingsService,
  ) { }

  async createParcel(
    data:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
          sendingOfficeId?: string;
          description: string;
          value: number;
          size?: "SMALL" | "MEDIUM" | "LARGE";
          cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC" | "ELECTRONIC_SENSITIVE" | "DOCUMENT";
          payment?: {
            method: "CASH" | "MOBILE_MONEY" | "CARD";
            amount: number;
            reference?: string;
          };
        }
      | {
          customer: {
            firstName: string;
            phoneNumber: string;
          };
          receiver: {
            firstName: string;
            phoneNumber: string;
          };
          officeId: string;
          description: string;
          value: number;
          sendingOfficeId?: string;
          size: "SMALL" | "MEDIUM" | "LARGE";
          cargoType?: "NORMAL" | "FRAGILE" | "ELECTRONIC" | "ELECTRONIC_SENSITIVE" | "DOCUMENT";
          payment: {
            method: "CASH" | "MOBILE_MONEY" | "CARD";
            amount: number;
            reference?: string;
          };
        },
    options?: { requireReceivable?: boolean; cashierId?: string }
  ): Promise<Parcel> {

    const requireReceivable = options?.requireReceivable ?? false;
    const office: Office = await this.prisma.office.findUnique({
      where: { id: data.officeId },
    });
    if (!office) {
      throw new Error("Office not found");
    }

    if (requireReceivable) {
      const officeTypes = Array.isArray((office as any).officeTypes)
        ? (office as any).officeTypes
        : [];
      const isReceivingOffice = officeTypes.includes('RECEIVING');
      const isDispatchOnly = !isReceivingOffice && officeTypes.length === 1 && officeTypes.includes('DISPATCH');

      if (!isReceivingOffice || isDispatchOnly) {
        throw new BadRequestException('Selected destination office cannot receive parcels.');
      }
    }

    // Determine whether we received IDs or nested customer objects
    let customerId: string;
    let receiverId: string;

    if ("customerId" in data && "receiverId" in data) {
      customerId = data.customerId;
      receiverId = data.receiverId;
    } else {
      const payload = data as any;
      const customerPhone = normalizeZMBPhone(payload.customer.phoneNumber);
      const receiverPhone = normalizeZMBPhone(payload.receiver.phoneNumber);
      if (!customerPhone || !receiverPhone) {
        throw new BadRequestException('Invalid phone number supplied for sender or receiver');
      }
      const [customer, receiver] = await Promise.all([
        this.prisma.customer.upsert({
          where: { phoneNumber: customerPhone },
          create: {
            firstName: payload.customer.firstName,
            phoneNumber: customerPhone,
          },
          update: {
            firstName: payload.customer.firstName,
            phoneNumber: customerPhone,
          },
        }),
        this.prisma.customer.upsert({
          where: { phoneNumber: receiverPhone },
          create: {
            firstName: payload.receiver.firstName,
            phoneNumber: receiverPhone,
          },
          update: {
            firstName: payload.receiver.firstName,
            phoneNumber: receiverPhone,
          },
        }),
      ]);
      customerId = customer.id;
      receiverId = receiver.id;
    }

    const description = String((data as any).description ?? '').trim();
    if (!description) {
      throw new BadRequestException('Parcel description is required');
    }

    const declaredValueRaw = Number((data as any).value);
    if (!Number.isFinite(declaredValueRaw) || declaredValueRaw < 0) {
      throw new BadRequestException('Parcel value must be a non-negative number');
    }

    // Normalize cargo type: map ELECTRONIC_SENSITIVE to ELECTRONIC for database
    let cargoType = ((data as any).cargoType as any) || "NORMAL";
    if (cargoType === "ELECTRONIC_SENSITIVE") {
      cargoType = "ELECTRONIC";
    }

    const parcel = await this.prisma.parcel.create({
      data: {
        customerId,
        receiverId,
        officeId: (data as any).officeId,
        sendingOfficeId: (data as any).sendingOfficeId || (data as any).officeId,
        size: ((data as any).size as any) || "MEDIUM",
        cargoType,
        description,
        value: Number(declaredValueRaw.toFixed(2)),
        createdById: options?.cashierId || null,
      },
    });

    const route = await this.prisma.route.findUnique({
      where: { id: office.routeId },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    const routeCode = route.code;
  const destinationCode = (office as any).areaCode ?? office.branchCode;
    const branchCode = office.branchCode;
    const parcelNumber = parcel.parcelNumber;
    const plainTextCode = `${routeCode}${destinationCode}${branchCode}${parcelNumber}`;

    // Create the tracking code
    await this.prisma.trackingCode.create({
      data: {
        routeCode,
        destinationCode,
        branchCode,
        parcelId: parcel.id,
        plainTextCode,
      },
    });

    // Create bar code PNG - Cached for performance
    await generateBarcodeForId(
      parcel.id,
      "parcel",
      `./barcodes/parcel-${parcel.id}.png`
    );

    // Create payment record if provided
    const paymentPayload = (data as any).payment;
    if (paymentPayload && typeof paymentPayload.amount === "number") {
      await this.prisma.payment.create({
        data: {
          parcelId: parcel.id,
          amount: paymentPayload.amount,
          method: paymentPayload.method as any,
          reference: paymentPayload.reference || null,
          cashierId: options?.cashierId || null,
        },
      });
    }

    // Generate triplicate receipts (sender, sticker, accounts)
try {
  const cashierId = options?.cashierId;
  await generateReceiptsForParcel(parcel.id, cashierId);
} catch (e) {
  // Non-blocking: log but do not fail parcel creation
  console.error("Failed to generate receipts", e);
}

    // Send SMS notifications (sender & receiver)
    try {
      const tracking = await this.prisma.trackingCode.findUnique({
        where: { parcelId: parcel.id },
      });
      const code = tracking?.plainTextCode;
      const sender = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      const receiver = await this.prisma.customer.findUnique({
        where: { id: receiverId },
      });
      
      // Get sending office and destination office
      const sendingOffice = await this.prisma.office.findUnique({
        where: { id: parcel.sendingOfficeId },
      });
      const destinationOffice = await this.prisma.office.findUnique({
        where: { id: parcel.officeId },
      });
      
      if (sender?.phoneNumber && code) {
        const senderMsisdn = normalizeZMBPhone(sender.phoneNumber as any);
        if (senderMsisdn) {
          await sendTemplateSms(
            senderMsisdn,
            SmsTemplates.PARCEL.CREATED.SENDER,
            sender.firstName,
            sender.lastName,
            sendingOffice?.name || 'Unknown',
            destinationOffice?.name || 'Unknown',
            code,
            `${receiver?.firstName || ''} ${receiver?.lastName || ''}`.trim() || 'Unknown',
            description
          );
        }
      }
      if (receiver?.phoneNumber && code) {
        const receiverMsisdn = normalizeZMBPhone(receiver.phoneNumber as any);
        if (receiverMsisdn) {
          await sendTemplateSms(
            receiverMsisdn,
            SmsTemplates.PARCEL.CREATED.RECEIVER,
            receiver.firstName,
            receiver.lastName,
            sendingOffice?.name || 'Unknown',
            destinationOffice?.name || 'Unknown',
            code,
            `${sender.firstName} ${sender.lastName}`,
            description
          );
        }
      }
    } catch (e) {
      console.error("Failed to send SMS", e);
    }

    return parcel;
  }

  async getParcelsPaginated(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    sendingOfficeId?: string,
    cashierId?: string,
    createdById?: string
  ) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const where: any = {};
    const term = search?.trim();

    // Filter by sending office if provided (for supervisors)
    if (sendingOfficeId) {
      where.sendingOfficeId = sendingOfficeId;
    }

    // Filter by cashier if provided
    if (cashierId) {
      where.payment = {
        is: {
          cashierId: cashierId,
        },
      };
    }

    // Filter by createdById if provided (for cashiers)
    if (createdById) {
      where.createdById = createdById;
    }

    // Handle search term
    if (term) {
      const or: any[] = [
        {
          TrackingCode: {
            is: {
              plainTextCode: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          receiver: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const parcelNumberMatch = Number(term);
      if (!Number.isNaN(parcelNumberMatch)) {
        or.push({ parcelNumber: parcelNumberMatch });
      }

      const statusCandidate = term.toUpperCase();
      const validStatuses = Object.values(ParcelStatus) as string[];
      if (validStatuses.includes(statusCandidate)) {
        or.push({ status: statusCandidate as ParcelStatus });
      }

      where.OR = or;
    }

    // Handle status filter
    if (status && status.trim()) {
      const statusUpper = status.trim().toUpperCase();

      // Handle pseudo-statuses that are determined by other fields
      if (statusUpper === 'ARRIVED') {
        // ARRIVED means the parcel has arrivedAt timestamp set
        where.arrivedAt = { not: null };
      } else if (statusUpper === 'IN_TRANSIT') {
        // IN_TRANSIT means the parcel hasn't arrived yet and isn't cancelled
        where.arrivedAt = null;
        where.status = { not: 'CANCELLED' };
      } else {
        // Handle actual enum statuses
        const validStatuses = Object.values(ParcelStatus) as string[];
        if (validStatuses.includes(statusUpper)) {
          where.status = statusUpper as ParcelStatus;
        }
      }
    }

    // Handle date range filter (using raw YYYY-MM-DD format from frontend)
    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        // Parse YYYY-MM-DD and set to start of day in local timezone
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }

      if (endDate) {
        // Parse YYYY-MM-DD and set to end of day in local timezone
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [data, total, thresholdDays] = await Promise.all([
      this.prisma.parcel.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          // Include user who created the parcel
          customer: {
            select: {
              firstName: true,
              lastName: true,
              emailAddress: true,
              phoneNumber: true,
            },
          },
          receiver: {
            select: {
              firstName: true,
              lastName: true,
              emailAddress: true,
              phoneNumber: true,
            },
          },
          sendingOffice: {
            select: {
              name: true,
              branchCode: true,
            },
          },
          office: {
            select: {
              branchCode: true,
              name: true,
              officeTypes: true,
            },
          },
          TrackingCode: {
            select: {
              plainTextCode: true,
            },
          },
          payment: {
            select: {
              amount: true,
              method: true,
              reference: true,
              paidAt: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reminderLogs: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: {
              sentAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          cancellationLogs: {
            orderBy: { cancelledAt: 'desc' },
            take: 1,
            select: {
              cancelledAt: true,
              reason: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.parcel.count({ where }),
      this.systemSettings.getUncollectedThresholdDays(),
    ]);

    // Add isOverdue flag to each parcel
    const enrichedData = data.map((parcel) => {
      let isOverdue = false;
      if (parcel.arrivedAt && parcel.status !== ParcelStatus.COLLECTED && parcel.status !== ParcelStatus.CANCELLED) {
        const daysSinceArrival = this.time.diffInDays(parcel.arrivedAt, this.time.now());
        isOverdue = daysSinceArrival > thresholdDays;
      }

      return {
        ...parcel,
        isOverdue,
        daysSinceArrival: parcel.arrivedAt
          ? Math.floor(this.time.diffInDays(parcel.arrivedAt, this.time.now()))
          : null,
      };
    });

    return {
      data: enrichedData,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getParcelScanHistory(parcelId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      select: {
        id: true,
        TrackingCode: { select: { plainTextCode: true } },
      },
    });
    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const scans = await this.prisma.scannedParcel.findMany({
      where: { parcelId },
      orderBy: { scannedAt: 'asc' },
      include: {
        scannedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        scanningSession: {
          select: {
            id: true,
            mode: true,
            startedAt: true,
            closedAt: true,
            bay: {
              select: {
                id: true,
                name: true,
                bayType: true,
              },
            },
            office: {
              select: {
                id: true,
                name: true,
                branchCode: true,
                officeTypes: true,
              },
            },
            route: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            trip: {
              select: {
                id: true,
                driverName: true,
                truckReg: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return {
      parcel: {
        id: parcel.id,
        trackingCode: parcel.TrackingCode?.plainTextCode ?? null,
      },
      scans: scans.map((scan) => ({
        id: scan.id,
        scannedAt: scan.scannedAt,
        scannedBy: {
          id: scan.scannedBy.id,
          firstName: scan.scannedBy.firstName,
          lastName: scan.scannedBy.lastName,
          email: scan.scannedBy.email,
        },
        office: scan.scanningSession.office
          ? {
              id: scan.scanningSession.office.id,
              name: scan.scanningSession.office.name,
              branchCode: scan.scanningSession.office.branchCode,
            }
          : null,
        bay: (() => {
          const session = scan.scanningSession;
          if (session.bay) {
            return {
              id: session.bay.id,
              name: session.bay.name,
              bayType: session.bay.bayType,
            };
          }

          const officeTypes = Array.isArray(session.office?.officeTypes)
            ? session.office.officeTypes
            : [];

          let fallbackType: string | null = null;
          if (session.trip) {
            fallbackType = "DISPATCH";
          } else if (officeTypes.includes("RECEIVING")) {
            fallbackType = "RECEIVING";
          } else if (officeTypes.includes("SENDING")) {
            fallbackType = "SENDING";
          }

          const fallbackName = (() => {
            if (fallbackType === "DISPATCH") return "Dispatch Bay";
            if (fallbackType === "RECEIVING") return "Receiving Bay";
            if (fallbackType === "SENDING") return "Sending Bay";
            if (session.office?.name) return `${session.office.name} Bay`;
            return "Unknown Bay";
          })();

          const resolvedType = fallbackType ?? "UNKNOWN";

          return {
            id: null,
            name: fallbackName,
            bayType: resolvedType,
          };
        })(),
        route: scan.scanningSession.route
          ? {
              id: scan.scanningSession.route.id,
              name: scan.scanningSession.route.name,
              code: scan.scanningSession.route.code,
            }
          : null,
        trip: scan.scanningSession.trip
          ? {
              id: scan.scanningSession.trip.id,
              driverName: scan.scanningSession.trip.driverName,
              truckReg: scan.scanningSession.trip.truckReg,
              status: scan.scanningSession.trip.status,
            }
          : null,
        session: {
          id: scan.scanningSession.id,
          mode: scan.scanningSession.mode,
          startedAt: scan.scanningSession.startedAt,
          closedAt: scan.scanningSession.closedAt,
        },
      })),
    };
  }

  async cancelParcel(parcelId: string, cancelledBy: string, reason: string) {
    const cleanReason = (reason || "").trim();
    if (!cleanReason) {
      throw new BadRequestException("Cancellation reason is required");
    }

    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        TrackingCode: { select: { plainTextCode: true } },
        office: { select: { name: true, branchCode: true } },
      },
    });

    if (!parcel) {
      throw new NotFoundException("Parcel not found");
    }

    if (parcel.status === ParcelStatus.CANCELLED) {
      throw new BadRequestException("Parcel is already cancelled");
    }

    if (parcel.status === ParcelStatus.COLLECTED) {
      throw new BadRequestException("Collected parcels cannot be cancelled");
    }

    const cancelledAt = this.time.now();

    const updated = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status: ParcelStatus.CANCELLED,
        cancelledAt,
        cancellationReason: cleanReason,
      },
    });

    await this.prisma.parcelCancellationLog.create({
      data: {
        parcelId,
        cancelledBy,
        reason: cleanReason,
        cancelledAt,
      },
    });

    return updated;
  }

  async markCollected(parcelId: string): Promise<Parcel> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { TrackingCode: true, customer: true, office: true },
    });
    if (!parcel) throw new NotFoundException("Parcel not found");
    if (parcel.status === ParcelStatus.CANCELLED) {
      throw new BadRequestException("Parcel has been cancelled");
    }
    if (parcel.status !== (ParcelStatus as any).READY_FOR_COLLECTION) {
      throw new BadRequestException("Parcel is not ready for collection");
    }
    const updated = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: { status: (ParcelStatus as any).COLLECTED },
    });
    try {
      const code = parcel.TrackingCode?.plainTextCode || parcel.id;
      const dest = parcel.office
        ? `${parcel.office.name} (${parcel.office.branchCode})`
        : "the office";
      if ((parcel as any).customer?.phoneNumber) {
        const msisdn = `260${(parcel as any).customer.phoneNumber}`;
        await sendTemplateSms(
          msisdn,
          SmsTemplates.PARCEL.COLLECTED,
          (parcel as any).customer.firstName,
          (parcel as any).customer.lastName,
          code,
          dest,
          'Collected',
          parcel.description
        );
      }
    } catch { }
    return updated;
  }

  async findByIdWithPayment(parcelId: string) {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        payment: {
          select: {
            cashierId: true,
          },
        },
      },
    });
    if (!parcel) throw new NotFoundException("Parcel not found");
    return parcel;
  }

  async findByTrackingCode(code: string) {
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: {
        parcel: {
          include: {
            customer: true,
            receiver: true,
            office: true,
            TrackingCode: true,
          },
        },
      },
    });
    if (!tracking || !tracking.parcel)
      throw new NotFoundException("Parcel not found");
    return tracking.parcel;
  }

  async collectByCode(code: string) {
    const p = await this.findByTrackingCode(code);
    return this.markCollected(p.id);
  }

  async getPublicTrackingInfo(code: string) {
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: {
        parcel: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            receiver: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            office: {
              select: {
                name: true,
              },
            },
            complaints: {
              where: { status: 'CLOSED' },
              orderBy: { updatedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!tracking || !tracking.parcel) {
      throw new NotFoundException("Parcel not found");
    }

    const parcel = tracking.parcel;

    // Create a simplified tracking history based on parcel status
    const trackingHistory = [];

    if (parcel.createdAt) {
      trackingHistory.push({
        status: "PENDING",
        location: "Sender Office",
        timestamp: this.time.toISO(parcel.createdAt),
        description: "Parcel received at sender office",
      });
    }

    if (parcel.status === "CANCELLED") {
      trackingHistory.push({
        status: "CANCELLED",
        location: parcel.office.name,
        timestamp: parcel.cancelledAt
          ? this.time.toISO(parcel.cancelledAt)
          : this.time.toISO(parcel.createdAt),
        description: parcel.cancellationReason
          ? `Parcel cancelled: ${parcel.cancellationReason}`
          : "Parcel cancelled",
      });
    } else if (parcel.status === "COLLECTED") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(this.time.addHours(parcel.arrivedAt, -24))
          : this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "DELIVERED",
        location: parcel.office.name,
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(this.time.addHours(parcel.arrivedAt, 24))
          : this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel collected by recipient",
      });
    } else if (parcel.status === "READY_FOR_COLLECTION") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(this.time.addHours(parcel.arrivedAt, -24))
          : this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "READY_FOR_COLLECTION",
        location: parcel.office.name,
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(parcel.arrivedAt)
          : this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel ready for collection at destination office",
      });
    } else if (parcel.status === "DAMAGED") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(this.time.addHours(parcel.arrivedAt, -24))
          : this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "DAMAGED",
        location: parcel.office.name,
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(parcel.arrivedAt)
          : this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel damaged during transit - complaint filed",
      });
    } else if (parcel.status === "COMPLAINT_BOX") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(this.time.addHours(parcel.arrivedAt, -24))
          : this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "COMPLAINT_BOX",
        location: parcel.office.name,
        timestamp: parcel.arrivedAt 
          ? this.time.toISO(parcel.arrivedAt)
          : this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel under complaint investigation",
      });
    }

    // Add complaint resolution tracking entry if there's a resolved complaint
    const hasResolvedComplaint = parcel.complaints && parcel.complaints.length > 0;
    
    if (hasResolvedComplaint) {
      const resolvedComplaint = parcel.complaints[0];
      trackingHistory.push({
        status: "RESOLVED",
        location: parcel.office.name,
        timestamp: this.time.toISO(resolvedComplaint.updatedAt),
        description: "Complaint resolved - issue has been addressed",
      });
    }

    // Helper function to mask phone numbers
    const maskPhoneNumber = (phone: string): string => {
      if (!phone || phone.length < 4) return '***';
      return phone.substring(0, 4) + '*'.repeat(phone.length - 4);
    };

    // Helper function to mask names
    const maskName = (name: string): string => {
      if (!name || name.length < 2) return '***';
      return name.charAt(0) + '*'.repeat(name.length - 1);
    };

    return {
      id: parcel.id,
      parcelNumber: tracking.plainTextCode,
      status: parcel.status === "COLLECTED" 
        ? "DELIVERED" 
        : hasResolvedComplaint && (parcel.status === "DAMAGED" || parcel.status === "COMPLAINT_BOX")
          ? "READY_FOR_COLLECTION"
          : parcel.status || "PENDING",
      createdAt: this.time.toISO(parcel.createdAt),
      deliveredAt: parcel.status === "COLLECTED" && parcel.arrivedAt
        ? this.time.toISO(this.time.addHours(parcel.arrivedAt, 24))
        : undefined,
      sender: {
        firstName: maskName(parcel.customer.firstName),
        lastName: maskName(parcel.customer.lastName),
        phoneNumber: maskPhoneNumber(parcel.customer.phoneNumber),
      },
      receiver: {
        firstName: maskName(parcel.receiver.firstName),
        lastName: maskName(parcel.receiver.lastName),
        phoneNumber: maskPhoneNumber(parcel.receiver.phoneNumber),
      },
      destination: {
        name: parcel.office.name,
      },
      currentLocation: trackingHistory.length > 0 ? {
        name: trackingHistory[trackingHistory.length - 1].location,
        timestamp: trackingHistory[trackingHistory.length - 1].timestamp,
      } : null,
      trackingHistory,
    };
  }

  /**
   * Mark a parcel as arrived at the receiving office
   */
  async markParcelArrived(parcelId: string): Promise<Parcel> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        receiver: true,
        office: true,
        TrackingCode: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.status === ParcelStatus.CANCELLED) {
      throw new BadRequestException('Parcel has been cancelled');
    }

    if (parcel.arrivedAt) {
      throw new BadRequestException('Parcel already marked as arrived');
    }

    const updated = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        arrivedAt: this.time.now(),
        status: ParcelStatus.READY_FOR_COLLECTION,
      },
    });

    // Send SMS to receiver
    try {
      const code = parcel.TrackingCode?.plainTextCode || parcel.id;
      const destination = parcel.office
        ? `${parcel.office.name} (${parcel.office.branchCode})`
        : 'the office';

      if (parcel.receiver?.phoneNumber) {
        const msisdn = normalizeZMBPhone(parcel.receiver.phoneNumber);
        if (msisdn) {
          await sendTemplateSms(
            msisdn,
            SmsTemplates.READY.COLLECTION,
            parcel.receiver.firstName,
            parcel.receiver.lastName,
            code,
            destination,
            parcel.description
          );
        }
      }
    } catch (e) {
      console.error('Failed to send arrival SMS', e);
    }

    return updated;
  }

  /**
   * Check if a parcel is overdue for collection
   */
  async isParcelOverdue(parcel: {
    arrivedAt: Date | null;
    status: ParcelStatus;
  }): Promise<boolean> {
    if (!parcel.arrivedAt || parcel.status === ParcelStatus.COLLECTED || parcel.status === ParcelStatus.CANCELLED) {
      return false;
    }

    const thresholdDays = await this.systemSettings.getUncollectedThresholdDays();
    const now = this.time.now();
    const daysSinceArrival = this.time.diffInDays(parcel.arrivedAt, now);

    return daysSinceArrival > thresholdDays;
  }

  /**
   * Send SMS reminder for uncollected parcel
   */
  async sendParcelReminder(parcelId: string, userId: string): Promise<void> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        receiver: true,
        office: true,
        TrackingCode: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    if (parcel.status === ParcelStatus.CANCELLED) {
      throw new BadRequestException('Parcel has been cancelled');
    }

    if (!parcel.arrivedAt) {
      throw new BadRequestException('Parcel has not arrived at receiving office yet');
    }

    if (parcel.status === ParcelStatus.COLLECTED) {
      throw new BadRequestException('Parcel has already been collected');
    }

    const isOverdue = await this.isParcelOverdue(parcel);
    if (!isOverdue) {
      throw new BadRequestException('Parcel is not yet overdue');
    }

    const code = parcel.TrackingCode?.plainTextCode || parcel.id;
    const destination = parcel.office
      ? `${parcel.office.name} (${parcel.office.branchCode})`
      : 'the office';

    const message = SmsTemplates.PARCEL.UNCOLLECTED_REMINDER(
      parcel.receiver?.firstName || '',
      parcel.receiver?.lastName || '',
      code,
      destination,
      parcel.description
    );

    if (!parcel.receiver?.phoneNumber) {
      throw new BadRequestException('Receiver phone number not found');
    }

    const msisdn = normalizeZMBPhone(parcel.receiver.phoneNumber);
    if (!msisdn) {
      throw new BadRequestException('Invalid receiver phone number');
    }

    // Send SMS
    await sendTemplateSms(msisdn, () => message);

    // Log the reminder
    await this.prisma.parcelReminderLog.create({
      data: {
        parcelId,
        sentBy: userId,
        message,
      },
    });
  }

  /**
   * Get overdue parcels for a specific office
   */
  async getOverdueParcels(officeId?: string) {
    const thresholdDays = await this.systemSettings.getUncollectedThresholdDays();
    const cutoffDate = this.time.addDays(this.time.now(), -thresholdDays);

    const where: any = {
      arrivedAt: {
        lte: cutoffDate,
        not: null,
      },
      status: {
        in: [ParcelStatus.READY_FOR_COLLECTION, ParcelStatus.PENDING],
      },
    };

    if (officeId) {
      where.officeId = officeId;
    }

    return this.prisma.parcel.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        receiver: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        office: {
          select: {
            name: true,
            branchCode: true,
          },
        },
        TrackingCode: {
          select: {
            plainTextCode: true,
          },
        },
        reminderLogs: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        arrivedAt: 'asc',
      },
    });
  }

  async exportParcelsToCSV(
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    sendingOfficeId?: string,
    cashierId?: string,
    createdById?: string
  ): Promise<string> {
    // Use the same filtering logic as getParcelsPaginated
    const where: any = {};
    const term = search?.trim();

    // Filter by sending office if provided (for supervisors)
    if (sendingOfficeId) {
      where.sendingOfficeId = sendingOfficeId;
    }

    // Filter by cashier if provided
    if (cashierId) {
      where.payment = {
        is: {
          cashierId: cashierId,
        },
      };
    }

    // Filter by createdById if provided (for cashiers)
    if (createdById) {
      where.createdById = createdById;
    }

    if (term) {
      const or: any[] = [
        {
          TrackingCode: {
            is: {
              plainTextCode: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          receiver: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const parcelNumberMatch = Number(term);
      if (!Number.isNaN(parcelNumberMatch)) {
        or.push({ parcelNumber: parcelNumberMatch });
      }

      where.OR = or;
    }

    if (status && status.trim()) {
      const statusUpper = status.trim().toUpperCase();

      // Handle pseudo-statuses that are determined by other fields
      if (statusUpper === 'ARRIVED') {
        // ARRIVED means the parcel has arrivedAt timestamp set
        where.arrivedAt = { not: null };
      } else if (statusUpper === 'IN_TRANSIT') {
        // IN_TRANSIT means the parcel hasn't arrived yet and isn't cancelled
        where.arrivedAt = null;
        where.status = { not: 'CANCELLED' };
      } else {
        // Handle actual enum statuses
        const validStatuses = Object.values(ParcelStatus) as string[];
        if (validStatuses.includes(statusUpper)) {
          where.status = statusUpper as ParcelStatus;
        }
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const parcels = await this.prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        receiver: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        office: {
          select: {
            name: true,
            branchCode: true,
          },
        },
        sendingOffice: {
          select: {
            name: true,
            branchCode: true,
          },
        },
        TrackingCode: {
          select: {
            plainTextCode: true,
          },
        },
        payment: {
          select: {
            amount: true,
            method: true,
            paidAt: true,
          },
        },
      },
    });

    // Build CSV content
    const headers = [
      'Tracking Code',
      'Parcel Number',
      'Status',
      'Description',
      'Value',
      'Size',
      'Sender Name',
      'Sender Phone',
      'Receiver Name',
      'Receiver Phone',
      'Destination Office',
      'Sending Office',
      'Payment Amount',
      'Payment Method',
      'Created At',
    ];

    const rows = parcels.map((p: any) => [
      p.TrackingCode?.plainTextCode || '',
      p.parcelNumber || '',
      p.status || '',
      (p.description || '').replace(/"/g, '""'), // Escape quotes
      p.value || '',
      p.size || '',
      `${p.customer?.firstName || ''} ${p.customer?.lastName || ''}`.trim(),
      p.customer?.phoneNumber || '',
      `${p.receiver?.firstName || ''} ${p.receiver?.lastName || ''}`.trim(),
      p.receiver?.phoneNumber || '',
      p.office?.name || '',
      p.sendingOffice?.name || '',
      p.payment?.amount || '',
      p.payment?.method || '',
      p.createdAt ? new Date(p.createdAt).toISOString() : '',
    ]);

    const csvLines = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];

    return csvLines.join('\n');
  }

  async exportParcelsToPDF(
    search?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    sendingOfficeId?: string,
    cashierId?: string,
    createdById?: string
  ): Promise<Buffer> {
    // Use the same filtering logic
    const where: any = {};
    const term = search?.trim();

    // Filter by sending office if provided (for supervisors)
    if (sendingOfficeId) {
      where.sendingOfficeId = sendingOfficeId;
    }

    // Filter by cashier if provided
    if (cashierId) {
      where.payment = {
        is: {
          cashierId: cashierId,
        },
      };
    }

    // Filter by createdById if provided (for cashiers)
    if (createdById) {
      where.createdById = createdById;
    }

    if (term) {
      const or: any[] = [
        {
          TrackingCode: {
            is: {
              plainTextCode: {
                contains: term,
                mode: 'insensitive',
              },
            },
          },
        },
        {
          customer: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
        {
          receiver: {
            is: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phoneNumber: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];

      const parcelNumberMatch = Number(term);
      if (!Number.isNaN(parcelNumberMatch)) {
        or.push({ parcelNumber: parcelNumberMatch });
      }

      where.OR = or;
    }

    if (status && status.trim()) {
      const statusUpper = status.trim().toUpperCase();

      // Handle pseudo-statuses that are determined by other fields
      if (statusUpper === 'ARRIVED') {
        // ARRIVED means the parcel has arrivedAt timestamp set
        where.arrivedAt = { not: null };
      } else if (statusUpper === 'IN_TRANSIT') {
        // IN_TRANSIT means the parcel hasn't arrived yet and isn't cancelled
        where.arrivedAt = null;
        where.status = { not: 'CANCELLED' };
      } else {
        // Handle actual enum statuses
        const validStatuses = Object.values(ParcelStatus) as string[];
        if (validStatuses.includes(statusUpper)) {
          where.status = statusUpper as ParcelStatus;
        }
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const parcels = await this.prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        receiver: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        office: {
          select: {
            name: true,
            branchCode: true,
          },
        },
        sendingOffice: {
          select: {
            name: true,
            branchCode: true,
          },
        },
        TrackingCode: {
          select: {
            plainTextCode: true,
          },
        },
        payment: {
          select: {
            amount: true,
            method: true,
            paidAt: true,
          },
        },
      },
    });

    // Generate a simple PDF using a library (you'll need to install one like pdfkit)
    // For now, return a simple text-based PDF or throw error
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 30 });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));

    // Add title
    doc.fontSize(16).text('Parcel Export Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();

    // Add filters info
    if (search || status || startDate || endDate) {
      doc.fontSize(10).text('Filters:', { underline: true });
      if (search) doc.text(`Search: ${search}`);
      if (status) doc.text(`Status: ${status}`);
      if (startDate) doc.text(`Start Date: ${startDate}`);
      if (endDate) doc.text(`End Date: ${endDate}`);
      doc.moveDown();
    }

    doc.fontSize(12).text(`Total Parcels: ${parcels.length}`, { underline: true });
    doc.moveDown();

    // Add parcel data
    parcels.forEach((p: any, index) => {
      if (index > 0) doc.moveDown();

      doc.fontSize(10);
      doc.text(`${index + 1}. ${p.TrackingCode?.plainTextCode || 'N/A'} - Parcel #${p.parcelNumber}`);
      doc.fontSize(8);
      doc.text(`   Status: ${p.status} | Size: ${p.size} | Value: K${p.value}`);
      doc.text(`   From: ${p.customer?.firstName || ''} (${p.customer?.phoneNumber || 'N/A'})`);
      doc.text(`   To: ${p.receiver?.firstName || ''} (${p.receiver?.phoneNumber || 'N/A'})`);
      doc.text(`   Destination: ${p.office?.name || 'N/A'}`);
      doc.text(`   Created: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}`);

      // Add page break if needed
      if (doc.y > 700) {
        doc.addPage();
      }
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);
    });
  }

  /**
   * Search for historical parcel descriptions for autocomplete
   */
  async searchDescriptions(query: string): Promise<string[]> {
    const cleanQuery = (query || '').trim().toUpperCase();

    if (!cleanQuery) {
      return [];
    }

    // Query recent parcels with matching descriptions
    const parcels = await this.prisma.parcel.findMany({
      where: {
        description: {
          contains: cleanQuery,
          mode: 'insensitive',
        },
      },
      select: {
        description: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Deduplicate and normalize to uppercase
    const uniqueDescriptions = new Set<string>();
    for (const parcel of parcels) {
      if (parcel.description) {
        const normalized = parcel.description.trim().toUpperCase();
        if (normalized) {
          uniqueDescriptions.add(normalized);
        }
      }
    }

    // Convert to array and limit to 10 results
    return Array.from(uniqueDescriptions).slice(0, 10);
  }

  async fixParcelsWithNullCreatedBy() {
    // Find all parcels with null createdById
    const parcelsWithNullCreatedBy = await this.prisma.parcel.findMany({
      where: {
        createdById: null,
      },
    });

    let updatedCount = 0;
    let skippedCount = 0;
    let orphanedCount = 0;

    // Update each parcel where payment exists and has a cashierId
    for (const parcel of parcelsWithNullCreatedBy) {
      const payment = await this.prisma.payment.findUnique({
        where: { parcelId: parcel.id },
        select: { cashierId: true },
      });

      // Skip orphaned parcels (no payment)
      if (!payment) {
        orphanedCount++;
        continue;
      }

      if (payment.cashierId) {
        await this.prisma.parcel.update({
          where: { id: parcel.id },
          data: { createdById: payment.cashierId },
        });
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return {
      message: 'Parcel createdBy fix completed',
      totalParcelsFound: parcelsWithNullCreatedBy.length,
      parcelsUpdated: updatedCount,
      parcelsSkipped: skippedCount,
      orphanedParcels: orphanedCount,
    };
  }
}