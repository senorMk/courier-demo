import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Parcel } from "@prisma/client";

@Injectable()
export class ParcelService {
  constructor(private prisma: PrismaService) {}

  async createParcel(data: {
    customerId: string;
    receiverId: string;
    destinationId: string;
  }): Promise<Parcel> {
    const destination = await this.prisma.destination.findUnique({
      where: { id: data.destinationId },
    });
    if (!destination) {
      throw new Error("Destination not found");
    }

    const parcel = await this.prisma.parcel.create({ data });

    const route = await this.prisma.route.findUnique({
      where: { id: destination.routeId },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    const routeCode = route.code;
    const destinationCode = destination.code;
    const branchCode = destination.branchCode;
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

    // Optionally, you can return the parcel with tracking code info
    return parcel;
  }

  async getParcelsPaginated(page: number = 1, pageSize: number = 10) {
    page = Math.max(1, page);
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.parcel.findMany({ skip, take: pageSize }),
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
}
