import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sendTemplateSms } from '../utils/sms-sender';
import { SmsTemplates } from '../config/sms-templates';
import { normalizeZMBPhone } from '../utils/phone.util';
import { TimeService } from "../common/time/time.service";

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private readonly time: TimeService,
  ) {}

  async createTrip(payload: { routeId: string; officeId: string; destinationOfficeId: string; destinationRouteId?: string; driverName: string; truckReg: string; }) {
    const { routeId, officeId, destinationOfficeId, destinationRouteId, driverName, truckReg } = payload;

    // Validate origin office belongs to route
    const origin = await this.prisma.office.findUnique({ where: { id: officeId } });
    if (!origin) throw new BadRequestException('Origin office not found');
    // if (origin.routeId !== routeId) throw new BadRequestException('Origin office not on selected route');

    // Validate destination office belongs to route
    const destination = await this.prisma.office.findUnique({ where: { id: destinationOfficeId } });
    if (!destination) throw new BadRequestException('Destination office not found');
    // if (destination.routeId !== routeId) throw new BadRequestException('Destination office not on selected route');

    if (destinationOfficeId === officeId) {
      throw new BadRequestException('Destination office must be different from origin office');
    }

    // Validate destination route if provided
    if (destinationRouteId) {
      const destRoute = await this.prisma.route.findUnique({ where: { id: destinationRouteId } });
      if (!destRoute) throw new BadRequestException('Destination route not found');
    }

    return this.prisma.trip.create({
      data: {
        routeId,
        officeId,
        destinationOfficeId,
        destinationRouteId: destinationRouteId || null,
        driverName,
        truckReg,
        status: 'PLANNED' as any,
      },
    });
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
    // Get current trip status before update
    const currentTrip = await this.prisma.trip.findUnique({ where: { id } });
    if (!currentTrip) throw new NotFoundException('Trip not found');

    // Set status IN_TRANSIT and departedAt
    const trip = await this.prisma.trip.update({
      where: { id },
      data: { status: 'IN_TRANSIT' as any, departedAt: this.time.now() },
    });

    // Log the trip start
    await this.prisma.tripLog.create({
      data: {
        tripId: id,
        action: 'STARTED',
        fromStatus: currentTrip.status as any,
        toStatus: 'IN_TRANSIT' as any,
        note: `Trip started from ${currentTrip.driverName} with truck ${currentTrip.truckReg}`,
        timestamp: this.time.now(),
      },
    });

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
      
      try {
        const customerPhone = normalizeZMBPhone(p.customer?.phoneNumber);
        if (customerPhone) {
          await sendTemplateSms(
            customerPhone,
            SmsTemplates.TRIP.DEPARTED,
            code,
            dest
          );
        }
      } catch {}
      
      try {
        const receiverPhone = normalizeZMBPhone(p.receiver?.phoneNumber);
        if (receiverPhone) {
          await sendTemplateSms(
            receiverPhone,
            SmsTemplates.TRIP.IN_TRANSIT,
            code,
            dest
          );
        }
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
    const updated = await this.prisma.trip.update({
      where: { id },
      data: { status: 'COMPLETED' as any, completedAt: this.time.now() },
    });

    // Log the trip completion
    await this.prisma.tripLog.create({
      data: {
        tripId: id,
        action: 'COMPLETED',
        fromStatus: trip.status as any,
        toStatus: 'COMPLETED' as any,
        note: `Trip completed. Driver: ${trip.driverName}, Truck: ${trip.truckReg}`,
        timestamp: this.time.now(),
      },
    });

    // SMS notifications removed: customers should only receive SMS when receiver role scans parcels
    // This ensures SMS is sent only when parcels are ready for collection, not just when trip completes

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
        include: { route: true, office: true, destinationOffice: true, destinationRoute: true },
      }),
      this.prisma.trip.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async openTrips(routeId: string, officeId: string) {
    if (!routeId || !officeId) throw new BadRequestException('routeId and officeId are required');
    return this.prisma.trip.findMany({
      where: {
        destinationRouteId: routeId,
        officeId,
        status: { in: ['PLANNED' as any, 'LOADING' as any] }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        driverName: true,
        truckReg: true,
        status: true,
        createdAt: true,
        destinationOfficeId: true,
        destinationOffice: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    });
  }

  async arrivedTrips(routeId: string, destinationOfficeId: string) {
    if (!routeId || !destinationOfficeId) throw new BadRequestException('routeId and destinationOfficeId are required');
    // Fetch in-transit trips heading to this office (for receiver validation)
    return this.prisma.trip.findMany({
      where: {
        destinationRouteId: routeId,
        destinationOfficeId,
        status: 'IN_TRANSIT' as any
      },
      orderBy: { departedAt: 'desc' },
      select: {
        id: true,
        driverName: true,
        truckReg: true,
        status: true,
        createdAt: true,
        completedAt: true,
        officeId: true,
        office: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
        destinationOfficeId: true,
        destinationOffice: {
          select: {
            id: true,
            name: true,
            branchCode: true,
          },
        },
      },
    });
  }
}
