import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sendSms } from '../utils/sms-sender';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async createTrip(payload: { routeId: string; officeId: string; driverName: string; truckReg: string; }) {
    // Validate office belongs to route
    const office = await this.prisma.office.findUnique({ where: { id: payload.officeId } });
    if (!office) throw new BadRequestException('Office not found');
    if (office.routeId !== payload.routeId) throw new BadRequestException('Office not on selected route');

    return this.prisma.trip.create({ data: { ...payload, status: 'PLANNED' as any } });
  }

  async assignTrip(id: string, payload: { driverName?: string; truckReg?: string; }) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    // Guard reassignment: allow only before IN_TRANSIT (i.e., PLANNED or LOADING)
    if (trip.status === 'IN_TRANSIT' || trip.status === 'COMPLETED') {
      throw new BadRequestException('Reassignment allowed only before departure');
    }
    return this.prisma.trip.update({ where: { id }, data: { ...payload } });
  }

  async linkSession(tripId: string, sessionId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    const session = await this.prisma.scanningSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.routeId !== trip.routeId || session.officeId !== trip.officeId) {
      throw new BadRequestException('Session does not belong to trip route/office');
    }
    return this.prisma.scanningSession.update({ where: { id: sessionId }, data: { tripId } });
  }

  async startTrip(id: string) {
    // Set status IN_TRANSIT and departedAt
    const trip = await this.prisma.trip.update({ where: { id }, data: { status: 'IN_TRANSIT' as any, departedAt: new Date() } });

    // Fetch all parcels scanned under this trip's sessions
    const sessions = await this.prisma.scanningSession.findMany({ where: { tripId: id }, select: { id: true } });
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return trip;

    const scans = await this.prisma.scannedParcel.findMany({
      where: { scanningSessionId: { in: sessionIds } },
      include: {
        parcel: { include: { customer: true, receiver: true, TrackingCode: true, office: true } },
      },
    });

    // Send SMS to sender and receiver
    for (const s of scans) {
      const p = s.parcel;
      if (!p) continue;
      const code = p.TrackingCode?.plainTextCode || p.id;
      const dest = p.office?.name ? `${p.office.name} (${p.office.branchCode})` : 'destination office';
      const msgSender = `PCS: Your parcel ${code} has departed and is in transit to ${dest}.`; // 160-char safe
      const msgReceiver = `PCS: Parcel ${code} for you is in transit to ${dest}.`;
      try {
        if (p.customer?.phoneNumber) await sendSms(`260${p.customer.phoneNumber}`, msgSender);
      } catch {}
      try {
        if (p.receiver?.phoneNumber) await sendSms(`260${p.receiver.phoneNumber}`, msgReceiver);
      } catch {}
    }

    return trip;
  }

  async completeTrip(id: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'IN_TRANSIT') {
      throw new BadRequestException('Only in-transit trips can be completed');
    }
    const updated = await this.prisma.trip.update({ where: { id }, data: { status: 'COMPLETED' as any, completedAt: new Date() } });

    // Optional: send arrival SMS to sender & receiver
    const sessions = await this.prisma.scanningSession.findMany({ where: { tripId: id }, select: { id: true } });
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length) {
      const scans = await this.prisma.scannedParcel.findMany({
        where: { scanningSessionId: { in: sessionIds } },
        include: { parcel: { include: { customer: true, receiver: true, TrackingCode: true, office: true } } }
      });
      for (const s of scans) {
        const p = s.parcel;
        if (!p) continue;
        const code = p.TrackingCode?.plainTextCode || p.id;
        const dest = p.office?.name ? `${p.office.name} (${p.office.branchCode})` : 'destination office';
        const msgSender = `PCS: Parcel ${code} has arrived at ${dest}.`;
        const msgReceiver = `PCS: Parcel ${code} for you has arrived at ${dest}.`;
        try { if (p.customer?.phoneNumber) await sendSms(`260${p.customer.phoneNumber}`, msgSender); } catch {}
        try { if (p.receiver?.phoneNumber) await sendSms(`260${p.receiver.phoneNumber}`, msgReceiver); } catch {}
      }
    }
    return updated;
  }

  async listTrips(params: { status?: string; page?: number; pageSize?: number } = {}) {
    const { status, page = 1, pageSize = 10 } = params;
    const where: any = {};
    if (status) where.status = status as any;
    const skip = (page - 1) * pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { route: true, office: true },
      }),
      this.prisma.trip.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async openTrips(routeId: string, officeId: string) {
    if (!routeId || !officeId) throw new BadRequestException('routeId and officeId are required');
    return this.prisma.trip.findMany({
      where: { routeId, officeId, status: { in: ['PLANNED' as any, 'LOADING' as any] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, driverName: true, truckReg: true, status: true, createdAt: true },
    });
  }
}
