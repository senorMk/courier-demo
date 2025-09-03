import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComplaintStatus, ParcelStatus } from '@prisma/client';

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async fileDamagedByCode(code: string, reason?: string) {
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: { parcel: true },
    });
    if (!tracking || !tracking.parcel) throw new NotFoundException('Parcel not found');
    const parcel = tracking.parcel;
    // Update parcel status to DAMAGED
    await this.prisma.parcel.update({ where: { id: parcel.id }, data: { status: ParcelStatus.DAMAGED } });
    // Create complaint
    const complaint = await this.prisma.complaint.create({
      data: { parcelId: parcel.id, reason: reason || null, status: ComplaintStatus.OPEN },
    });
    return complaint;
  }

  async list(page = 1, pageSize = 10, status?: ComplaintStatus) {
    const where: any = {};
    if (status) where.status = status;
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          parcel: {
            include: {
              TrackingCode: true,
              customer: true,
              receiver: true,
              office: true,
            },
          },
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async close(id: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');
    return this.prisma.complaint.update({ where: { id }, data: { status: ComplaintStatus.CLOSED } });
  }
}

