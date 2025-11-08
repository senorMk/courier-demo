import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Office, Parcel, ParcelStatus } from "@prisma/client";
import { generateBarcodeForId } from "../utils/barcode-generator";
import { generateReceiptsForParcel } from "../utils/receipt-generator";
import { sendSms } from "../utils/sms-sender";
import { normalizeZMBPhone } from "../utils/phone.util";
import { TimeService } from "../common/time/time.service";

@Injectable()
export class ParcelService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
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
        payment?: {
          method: "CASH" | "MOBILE_MONEY" | "CARD";
          amount: number;
          reference?: string;
        };
      }
      | {
        customer: {
          firstName: string;
          lastName: string;
          phoneNumber: string;
          emailAddress?: string;
          idNumber?: string;
        };
        receiver: {
          firstName: string;
          lastName: string;
          phoneNumber: string;
          emailAddress?: string;
          idNumber?: string;
        };
        officeId: string;
        description: string;
        value: number;
        sendingOfficeId?: string;
        size: "SMALL" | "MEDIUM" | "LARGE";
        payment: {
          method: "CASH" | "MOBILE_MONEY" | "CARD";
          amount: number;
          reference?: string;
        };
      }
  ): Promise<Parcel> {
    const office: Office = await this.prisma.office.findUnique({
      where: { id: data.officeId },
    });
    if (!office) {
      throw new Error("Office not found");
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
            lastName: payload.customer.lastName,
            phoneNumber: customerPhone,
            emailAddress: payload.customer.emailAddress || null,
            idNumber: payload.customer.idNumber || null,
          },
          update: {
            firstName: payload.customer.firstName,
            lastName: payload.customer.lastName,
            phoneNumber: customerPhone,
            emailAddress: payload.customer.emailAddress || null,
            idNumber: payload.customer.idNumber || null,
          },
        }),
        this.prisma.customer.upsert({
          where: { phoneNumber: receiverPhone },
          create: {
            firstName: payload.receiver.firstName,
            lastName: payload.receiver.lastName,
            phoneNumber: receiverPhone,
            emailAddress: payload.receiver.emailAddress || null,
            idNumber: payload.receiver.idNumber || null,
          },
          update: {
            firstName: payload.receiver.firstName,
            lastName: payload.receiver.lastName,
            phoneNumber: receiverPhone,
            emailAddress: payload.receiver.emailAddress || null,
            idNumber: payload.receiver.idNumber || null,
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

    const parcel = await this.prisma.parcel.create({
      data: {
        customerId,
        receiverId,
        officeId: (data as any).officeId,
        sendingOfficeId: (data as any).sendingOfficeId || (data as any).officeId,
        size: ((data as any).size as any) || "MEDIUM",
        description,
        value: Number(declaredValueRaw.toFixed(2)),
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
    const plainTextCode = `${routeCode}-${destinationCode}-${branchCode}-${parcelNumber}`;

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
        },
      });
    }

    // Generate triplicate receipts (sender, sticker, accounts)
    try {
      await generateReceiptsForParcel(parcel.id);
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
      if (sender?.phoneNumber && code) {
        const senderMsisdn = normalizeZMBPhone(sender.phoneNumber as any);
        if (senderMsisdn) {
          await sendSms(
            senderMsisdn,
            `Parcel Created: ${code}. Thank you for using PCS.`
          );
        }
      }
      if (receiver?.phoneNumber && code) {
        const receiverMsisdn = normalizeZMBPhone(receiver.phoneNumber as any);
        if (receiverMsisdn) {
          await sendSms(
            receiverMsisdn,
            `Incoming Parcel: ${code}. You will be notified upon arrival.`
          );
        }
      }
    } catch (e) {
      console.error("Failed to send SMS", e);
    }

    return parcel;
  }

  async getParcelsPaginated(page: number = 1, pageSize: number = 10, search?: string) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const where: any = {};
    const term = search?.trim();

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

    const [data, total] = await Promise.all([
      this.prisma.parcel.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: 'desc' },
        include: {
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
        },
      }),
      this.prisma.parcel.count({ where }),
    ]);
    return {
      data,
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

  async markCollected(parcelId: string): Promise<Parcel> {
    const parcel = await this.prisma.parcel.findUnique({
      where: { id: parcelId },
      include: { TrackingCode: true, customer: true, office: true },
    });
    if (!parcel) throw new NotFoundException("Parcel not found");
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
        await sendSms(
          `260${(parcel as any).customer.phoneNumber}`,
          `PCS: Parcel ${code} has been collected at ${dest}. Thank you.`
        );
      }
    } catch { }
    return updated;
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

    if (parcel.status === "COLLECTED") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "DELIVERED",
        location: parcel.office.name,
        timestamp: this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel collected by recipient",
      });
    } else if (parcel.status === "READY_FOR_COLLECTION") {
      trackingHistory.push({
        status: "IN_TRANSIT",
        location: "In Transit",
        timestamp: this.time.toISO(this.time.addHours(parcel.createdAt, 24)),
        description: "Parcel in transit to destination",
      });

      trackingHistory.push({
        status: "IN_TRANSIT",
        location: parcel.office.name,
        timestamp: this.time.toISO(this.time.addHours(parcel.createdAt, 48)),
        description: "Parcel ready for collection at destination office",
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
      status: parcel.status === "COLLECTED" ? "DELIVERED" : parcel.status || "PENDING",
      createdAt: this.time.toISO(parcel.createdAt),
      deliveredAt: parcel.status === "COLLECTED"
        ? this.time.toISO(this.time.addHours(parcel.createdAt, 48))
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
}
