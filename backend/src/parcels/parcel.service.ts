import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Office, Parcel, ParcelItem, ParcelStatus } from "@prisma/client";
import { generateBarcodeForId } from "../utils/barcode-generator";
import { generateReceiptsForParcel } from "../utils/receipt-generator";
import { sendSms } from "../utils/sms-sender";

@Injectable()
export class ParcelService {
  constructor(private prisma: PrismaService) {}

  async createParcel(
    data:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
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
      const [customer, receiver] = await Promise.all([
        this.prisma.customer.upsert({
          where: { phoneNumber: payload.customer.phoneNumber },
          create: {
            firstName: payload.customer.firstName,
            lastName: payload.customer.lastName,
            phoneNumber: payload.customer.phoneNumber,
            emailAddress: payload.customer.emailAddress || null,
            idNumber: payload.customer.idNumber || null,
          },
          update: {
            firstName: payload.customer.firstName,
            lastName: payload.customer.lastName,
            emailAddress: payload.customer.emailAddress || null,
            idNumber: payload.customer.idNumber || null,
          },
        }),
        this.prisma.customer.upsert({
          where: { phoneNumber: payload.receiver.phoneNumber },
          create: {
            firstName: payload.receiver.firstName,
            lastName: payload.receiver.lastName,
            phoneNumber: payload.receiver.phoneNumber,
            emailAddress: payload.receiver.emailAddress || null,
            idNumber: payload.receiver.idNumber || null,
          },
          update: {
            firstName: payload.receiver.firstName,
            lastName: payload.receiver.lastName,
            emailAddress: payload.receiver.emailAddress || null,
            idNumber: payload.receiver.idNumber || null,
          },
        }),
      ]);
      customerId = customer.id;
      receiverId = receiver.id;
    }

    const parcel = await this.prisma.parcel.create({
      data: {
        customerId,
        receiverId,
        officeId: (data as any).officeId,
        size: ((data as any).size as any) || "MEDIUM",
      },
    });

    const route = await this.prisma.route.findUnique({
      where: { id: office.routeId },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    const routeCode = route.code;
    const destinationCode = office.branchCode;
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
        await sendSms(
          sender.phoneNumber,
          `Parcel Created: ${code}. Thank you for using PCS.`
        );
      }
      if (receiver?.phoneNumber && code) {
        await sendSms(
          receiver.phoneNumber,
          `Incoming Parcel: ${code}. You will be notified upon arrival.`
        );
      }
    } catch (e) {
      console.error("Failed to send SMS", e);
    }

    return parcel;
  }

  async getParcelsPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.parcel.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              emailAddress: true,
            },
          },
          receiver: {
            select: {
              firstName: true,
              lastName: true,
              emailAddress: true,
            },
          },
          office: {
            select: {
              branchCode: true,
              name: true,
              officeType: true,
            },
          },
          TrackingCode: {
            select: {
              plainTextCode: true,
            },
          },
        },
      }),
      this.prisma.parcel.count(),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async addParcelItem(
    parcelId: string,
    data: {
      quantity: number;
      description: string;
      pricePerUnit: number;
      value: number;
      amount: number;
    }
  ): Promise<ParcelItem> {
    return this.prisma.parcelItem.create({
      data: {
        ...data,
        parcelId,
      },
    });
  }

  async getParcelItems(parcelId: string): Promise<ParcelItem[]> {
    return this.prisma.parcelItem.findMany({
      where: { parcelId },
    });
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
    } catch {}
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
}
