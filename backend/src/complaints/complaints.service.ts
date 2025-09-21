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

  private normalizeZMBPhone(msisdn?: string): string {
    if (!msisdn) return "";
    const digits = String(msisdn).replace(/\D/g, "");
    if (digits.startsWith("260")) return `+${digits}`;
    if (digits.startsWith("0")) return `+260${digits.slice(1)}`;
    if (digits.length === 9 && digits.startsWith("9")) return `+260${digits}`;
    return `+${digits}`;
  }

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
    // Notify sender and receiver that a complaint was filed (damaged)
    try {
      const [sender, receiver] = await Promise.all([
        this.prisma.customer.findUnique({ where: { id: parcel.customerId } }),
        this.prisma.customer.findUnique({ where: { id: parcel.receiverId } }),
      ]);
      const msg = `PCS: Complaint received for parcel ${code} (Damaged). We will investigate and update you.`;
      if (sender?.phoneNumber) await sendSms(this.normalizeZMBPhone(sender.phoneNumber), msg);
      if (receiver?.phoneNumber) await sendSms(this.normalizeZMBPhone(receiver.phoneNumber), msg);
    } catch (e) {
      // Non-blocking
      console.error("Failed to send complaint filed SMS (damaged)", e);
    }
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
    // Notify sender and receiver
    try {
      const [sender, receiver] = await Promise.all([
        this.prisma.customer.findUnique({ where: { id: parcel.customerId } }),
        this.prisma.customer.findUnique({ where: { id: parcel.receiverId } }),
      ]);
      const msg = `PCS: Complaint received for parcel ${code}. We will investigate and update you.`;
      if (sender?.phoneNumber) await sendSms(this.normalizeZMBPhone(sender.phoneNumber), msg);
      if (receiver?.phoneNumber) await sendSms(this.normalizeZMBPhone(receiver.phoneNumber), msg);
    } catch (e) {
      console.error("Failed to send complaint filed SMS (from collected)", e);
    }
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

  async close(id: string, note?: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
  parcel: { include: { TrackingCode: true, customer: true, receiver: true, office: true } },
      },
    });
    if (!complaint) throw new NotFoundException("Complaint not found");
    if (complaint.status === ComplaintStatus.CLOSED) return complaint;
    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.CLOSED },
    });
    await this.logEvent(
      id,
      "CLOSED",
      ComplaintStatus.OPEN,
      ComplaintStatus.CLOSED,
      note || "Complaint resolved"
    );
    // Notify sender and receiver that complaint has been resolved
    try {
      const code = complaint.parcel?.TrackingCode?.plainTextCode;
      const dest = complaint.parcel?.office?.name || "our office";
      const msg = `PCS: Complaint for parcel ${code} has been resolved at ${dest}.`;
      const senderMsisdn = complaint.parcel?.customer?.phoneNumber;
      const receiverMsisdn = complaint.parcel?.receiver?.phoneNumber as any;
      if (senderMsisdn) await sendSms(this.normalizeZMBPhone(senderMsisdn as any), msg);
      if (receiverMsisdn) await sendSms(this.normalizeZMBPhone(receiverMsisdn as any), msg);
    } catch (e) {
      console.error("Failed to send complaint resolved SMS", e);
    }
    return updated;
  }

  /** Generic complaint logging (Complaints Box) */
  async logGeneric(payload: { parcelId?: string; code?: string; reason?: string }) {
    if (!payload.parcelId && !payload.code) {
      throw new BadRequestException("Provide parcelId or tracking code");
    }
    let parcel = null;
    if (payload.parcelId) {
      parcel = await this.prisma.parcel.findUnique({ where: { id: payload.parcelId } });
    } else if (payload.code) {
      const tracking = await this.prisma.trackingCode.findUnique({
        where: { plainTextCode: payload.code },
        include: { parcel: true },
      });
      parcel = tracking?.parcel || null;
    }
    if (!parcel) throw new NotFoundException("Parcel not found");
  const complaint = await this.prisma.complaint.create({
      data: {
        parcelId: parcel.id,
        reason: payload.reason || null,
        status: ComplaintStatus.OPEN,
      },
    });
    // Move into complaint box
    await this.prisma.parcel.update({
      where: { id: parcel.id },
  data: { status: (ParcelStatus as any).COMPLAINT_BOX },
    });
    await this.logEvent(
      complaint.id,
      "OPENED_GENERIC",
      null,
      ComplaintStatus.OPEN,
      payload.reason || null
    );
    // Notify sender and receiver that complaint was filed (generic)
    try {
      const [sender, receiver, tracking] = await Promise.all([
        this.prisma.customer.findUnique({ where: { id: parcel.customerId } }),
        this.prisma.customer.findUnique({ where: { id: parcel.receiverId } }),
        this.prisma.trackingCode.findUnique({ where: { parcelId: parcel.id } }),
      ]);
      const code = payload.code || tracking?.plainTextCode || "";
      const msg = `PCS: Complaint received for parcel ${code}. We will investigate and update you.`;
      if (sender?.phoneNumber) await sendSms(this.normalizeZMBPhone(sender.phoneNumber), msg);
      if (receiver?.phoneNumber) await sendSms(this.normalizeZMBPhone(receiver.phoneNumber), msg);
    } catch (e) {
      console.error("Failed to send complaint filed SMS (generic)", e);
    }
    return complaint;
  }

  async report(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const [openCount, closed, all] = await this.prisma.$transaction([
      this.prisma.complaint.count({ where: { ...where, status: ComplaintStatus.OPEN } }),
      this.prisma.complaint.findMany({ where: { ...where, status: ComplaintStatus.CLOSED }, select: { createdAt: true, updatedAt: true } }),
      this.prisma.complaint.count({ where }),
    ]);
    const closedCount = closed.length;
    const avgResolutionMs = closedCount
      ? closed.reduce((acc, c) => acc + (c.updatedAt.getTime() - c.createdAt.getTime()), 0) / closedCount
      : 0;
    return {
      open: openCount,
      closed: closedCount,
      total: all,
      avgResolutionMinutes: Number((avgResolutionMs / 60000).toFixed(2)),
    };
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
