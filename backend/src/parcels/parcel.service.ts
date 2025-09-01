import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Office, Parcel, ParcelItem } from "@prisma/client";
import { generateBarcodeForId } from "../utils/barcode-generator";

@Injectable()
export class ParcelService {
  constructor(private prisma: PrismaService) {}

  async createParcel(
    data:
      | {
          customerId: string;
          receiverId: string;
          officeId: string;
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

    if ('customerId' in data && 'receiverId' in data) {
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

    // Optionally, you can return the parcel with tracking code info
    return parcel;
  }

  async getParcelsPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.parcel.findMany({
        skip,
        take: pageSize,
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
}
