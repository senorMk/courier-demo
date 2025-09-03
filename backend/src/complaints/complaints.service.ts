import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ComplaintStatus, ParcelStatus } from "@prisma/client";
import { sendSms } from "../utils/sms-sender";

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  private async logEvent(
    complaintId: string,
    action: string,
    from?: ComplaintStatus | null,
    to?: ComplaintStatus | null,
    note?: string | null
  ) {
    await this.prisma.complaintEvent.create({
      data: {
        complaintId,
        action,
        fromStatus: from ?? null,
        toStatus: to ?? null,
        note: note ?? null,
      },
    });
  }

  async fileDamagedByCode(code: string, reason?: string) {
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: { parcel: true },
    });
    if (!tracking || !tracking.parcel)
      throw new NotFoundException("Parcel not found");
    const parcel = tracking.parcel;
    // Update parcel status to DAMAGED
    await this.prisma.parcel.update({
      where: { id: parcel.id },
      data: { status: ParcelStatus.DAMAGED },
    });
    // Create complaint
    const complaint = await this.prisma.complaint.create({
      data: {
        parcelId: parcel.id,
        reason: reason || null,
        status: ComplaintStatus.OPEN,
      },
    });
    await this.logEvent(
      complaint.id,
      "OPENED_DAMAGED",
      null,
      ComplaintStatus.OPEN,
      reason || null
    );
    return complaint;
  }

  async fileFromCollectedByCode(code: string, reason?: string) {
    const tracking = await this.prisma.trackingCode.findUnique({
      where: { plainTextCode: code },
      include: { parcel: true },
    });
    if (!tracking || !tracking.parcel)
      throw new NotFoundException("Parcel not found");
    const parcel = tracking.parcel;
    if (parcel.status !== "COLLECTED") {
      throw new BadRequestException(
        "Only collected parcels can be moved to Complaint Box"
      );
    }
    const complaint = await this.prisma.complaint.create({
      data: {
        parcelId: parcel.id,
        reason: reason || null,
        status: ComplaintStatus.OPEN,
      },
    });
    await this.logEvent(
      complaint.id,
      "OPENED_FROM_COLLECTED",
      null,
      ComplaintStatus.OPEN,
      reason || null
    );
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
        },
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async close(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        parcel: {
          include: { TrackingCode: true, customer: true, office: true },
        },
      },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.CLOSED },
    });
    await this.logEvent(
      id,
      "CLOSED",
      ComplaintStatus.OPEN,
      ComplaintStatus.CLOSED,
      "Complaint resolved"
    );
    // SMS to sender: Complaint Resolved
    try {
      const code =
        complaint.parcel?.TrackingCode?.plainTextCode || complaint.parcel?.id;
      const dest = complaint.parcel?.office
        ? `${complaint.parcel.office.name} (${complaint.parcel.office.branchCode})`
        : "our office";
      const msisdn = (complaint.parcel as any)?.customer?.phoneNumber;
      if (msisdn && code) {
        await sendSms(
          `260${msisdn}`,
          `PCS: Complaint for parcel ${code} has been resolved at ${dest}.`
        );
      }
    } catch {}
    return updated;
  }

  async getEvents(complaintId: string) {
    const exists = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
    });
    if (!exists) throw new NotFoundException("Complaint not found");
    return this.prisma.complaintEvent.findMany({
      where: { complaintId },
      orderBy: { createdAt: "asc" },
    });
  }
}
