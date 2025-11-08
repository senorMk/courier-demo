import { BadRequestException, Injectable } from '@nestjs/common';
import { ComplaintStatus, ParcelStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TimeService } from '../common/time/time.service';
import {
  ReportExportFormat,
  ReportExportResult,
  ReportExporterService,
} from './report-exporter.service';

type DateRange = {
  start: Date;
  end: Date;
};

type RevenueGranularity = 'daily' | 'monthly';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: TimeService,
    private readonly exporter: ReportExporterService,
  ) {}

  private parseDate(value: string | undefined, label: 'startDate' | 'endDate'): Date | undefined {
    if (!value) {
      return undefined;
    }
    try {
      return this.time.parse(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}. Expected an ISO date string.`);
    }
  }

  private normalizeRange(startInput?: string, endInput?: string, fallbackDays = 30): DateRange {
    const endRaw = this.parseDate(endInput, 'endDate') ?? this.time.now();
    const end = this.time.endOfDay(endRaw);

    const startRaw = this.parseDate(startInput, 'startDate')
      ?? this.time.addDays(end, -(fallbackDays - 1));
    const start = this.time.startOfDay(startRaw);

    if (start > end) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    return { start, end };
  }

  private formatDate(date: Date): string {
    return this.time.format(date, 'yyyy-LL-dd');
  }

  private parseGranularity(input?: string): RevenueGranularity {
    if (!input) return 'daily';
    if (input === 'daily' || input === 'monthly') {
      return input;
    }
    throw new BadRequestException('granularity must be either "daily" or "monthly"');
  }

  private parseFormat(input?: string | null): ReportExportFormat {
    if (!input) {
      return 'csv';
    }

    const normalized = input.toLowerCase();
    if (normalized === 'csv') {
      return 'csv';
    }
    if (normalized === 'excel' || normalized === 'xlsx') {
      return 'excel';
    }

    throw new BadRequestException('format must be either "csv" or "excel"');
  }

  private toDateSegment(iso: string | null | undefined): string {
    if (!iso) {
      return 'unknown';
    }
    const segment = iso.split('T')[0]?.trim();
    return segment || 'unknown';
  }

  private buildFileBaseName(prefix: string, startIso: string, endIso: string): string {
    const start = this.toDateSegment(startIso);
    const end = this.toDateSegment(endIso);
    return `${prefix}_${start}_${end}`;
  }

  async getRevenueReport(params: { startDate?: string; endDate?: string; granularity?: string }) {
    const granularity = this.parseGranularity(params?.granularity);
    const fallbackDays = granularity === 'monthly' ? 365 : 30;
    const range = this.normalizeRange(params?.startDate, params?.endDate, fallbackDays);
    const payments = await this.prisma.payment.findMany({
      where: { paidAt: { gte: range.start, lte: range.end } },
      orderBy: { paidAt: 'asc' },
    });

    let totalAmount = 0;
    const buckets = new Map<string, { amount: number; payments: number; sampleDate: Date }>();

    for (const payment of payments) {
      const paidAt = payment.paidAt ?? payment.createdAt;
      const key = granularity === 'daily'
        ? this.formatDate(paidAt)
        : `${paidAt.getFullYear()}-${`${paidAt.getMonth() + 1}`.padStart(2, '0')}`;

      const existing = buckets.get(key) ?? { amount: 0, payments: 0, sampleDate: paidAt };
      existing.amount += payment.amount;
      existing.payments += 1;
      if (paidAt < existing.sampleDate) {
        existing.sampleDate = paidAt;
      }
      buckets.set(key, existing);
      totalAmount += payment.amount;
    }

    const data = Array.from(buckets.entries())
      .sort((a, b) => a[1].sampleDate.getTime() - b[1].sampleDate.getTime())
      .map(([period, value]) => ({
        period,
        amount: Number(value.amount.toFixed(2)),
        payments: value.payments,
      }));

    return {
      granularity,
      startDate: this.time.toISO(range.start),
      endDate: this.time.toISO(range.end),
      totalAmount: Number(totalAmount.toFixed(2)),
      totalPayments: payments.length,
      data,
      generatedAt: this.time.nowISO(),
    };
  }

  async getParcelMovementReport(params: { startDate?: string; endDate?: string }) {
    const range = this.normalizeRange(params?.startDate, params?.endDate, 30);
    const parcels = await this.prisma.parcel.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const statusBreakdown: Record<ParcelStatus, number> = {
      [ParcelStatus.PENDING]: 0,
      [ParcelStatus.COMPLAINT_BOX]: 0,
      [ParcelStatus.READY_FOR_COLLECTION]: 0,
      [ParcelStatus.COLLECTED]: 0,
      [ParcelStatus.DAMAGED]: 0,
    };

    const dailyMap = new Map<string, {
      date: string;
      total: number;
      pending: number;
      readyForCollection: number;
      collected: number;
      complaintBox: number;
      damaged: number;
    }>();

    for (const parcel of parcels) {
      const day = this.formatDate(parcel.createdAt);
      const bucket = dailyMap.get(day) ?? {
        date: day,
        total: 0,
        pending: 0,
        readyForCollection: 0,
        collected: 0,
        complaintBox: 0,
        damaged: 0,
      };
      bucket.total += 1;

      switch (parcel.status) {
        case ParcelStatus.PENDING:
          bucket.pending += 1;
          statusBreakdown[ParcelStatus.PENDING] += 1;
          break;
        case ParcelStatus.READY_FOR_COLLECTION:
          bucket.readyForCollection += 1;
          statusBreakdown[ParcelStatus.READY_FOR_COLLECTION] += 1;
          break;
        case ParcelStatus.COLLECTED:
          bucket.collected += 1;
          statusBreakdown[ParcelStatus.COLLECTED] += 1;
          break;
        case ParcelStatus.COMPLAINT_BOX:
          bucket.complaintBox += 1;
          statusBreakdown[ParcelStatus.COMPLAINT_BOX] += 1;
          break;
        case ParcelStatus.DAMAGED:
          bucket.damaged += 1;
          statusBreakdown[ParcelStatus.DAMAGED] += 1;
          break;
        default:
          break;
      }

      dailyMap.set(day, bucket);
    }

    const daily = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate: this.time.toISO(range.start),
      endDate: this.time.toISO(range.end),
      totalParcels: parcels.length,
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({ status, count })),
      daily,
      generatedAt: this.time.nowISO(),
    };
  }

  async getComplaintReport(params: { startDate?: string; endDate?: string }) {
    const range = this.normalizeRange(params?.startDate, params?.endDate, 30);
    const where: any = {
      createdAt: {
        gte: range.start,
        lte: range.end,
      },
    };

    const [openCount, closedComplaints, total, complaints] = await this.prisma.$transaction([
      this.prisma.complaint.count({ where: { ...where, status: ComplaintStatus.OPEN } }),
      this.prisma.complaint.findMany({
        where: { ...where, status: ComplaintStatus.CLOSED },
        select: { createdAt: true, updatedAt: true },
      }),
      this.prisma.complaint.count({ where }),
      this.prisma.complaint.findMany({
        where,
        select: { createdAt: true, updatedAt: true, status: true },
      }),
    ]);

    const closedCount = closedComplaints.length;
    const avgResolutionMs = closedCount
      ? closedComplaints.reduce((acc, c) => acc + ((c.updatedAt ?? c.createdAt).getTime() - c.createdAt.getTime()), 0) / closedCount
      : 0;

    const dailyMap = new Map<string, { date: string; logged: number; closed: number }>();
    for (const complaint of complaints) {
      const createdDay = this.formatDate(complaint.createdAt);
      const bucket = dailyMap.get(createdDay) ?? { date: createdDay, logged: 0, closed: 0 };
      bucket.logged += 1;
      dailyMap.set(createdDay, bucket);

      if (complaint.status === ComplaintStatus.CLOSED && complaint.updatedAt) {
        const closedDay = this.formatDate(complaint.updatedAt);
        const closedBucket = dailyMap.get(closedDay) ?? { date: closedDay, logged: 0, closed: 0 };
        closedBucket.closed += 1;
        dailyMap.set(closedDay, closedBucket);
      }
    }

    const daily = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      startDate: this.time.toISO(range.start),
      endDate: this.time.toISO(range.end),
      totals: {
        open: openCount,
        closed: closedCount,
        total,
        avgResolutionMinutes: Number((avgResolutionMs / 60000).toFixed(2)),
      },
      daily,
      generatedAt: this.time.nowISO(),
    };
  }

  async getDriverTripReport(params: { startDate?: string; endDate?: string }) {
    const range = this.normalizeRange(params?.startDate, params?.endDate, 60);
    const trips = await this.prisma.trip.findMany({
      where: { plannedAt: { gte: range.start, lte: range.end } },
      include: {
        route: { select: { name: true, code: true } },
        office: { select: { name: true, branchCode: true } },
      },
      orderBy: { plannedAt: 'asc' },
    });

    const statusBreakdown: Record<TripStatus, number> = {
      [TripStatus.PLANNED]: 0,
      [TripStatus.LOADING]: 0,
      [TripStatus.IN_TRANSIT]: 0,
      [TripStatus.COMPLETED]: 0,
    };

    type DriverAccumulator = {
      driverName: string;
      totalTrips: number;
      statusCounts: Record<TripStatus, number>;
      truckRegistrations: Set<string>;
      routes: Set<string>;
      offices: Set<string>;
      lastTripPlannedAt?: Date;
      lastStatus?: TripStatus;
      durationMs: number;
      completedTripsWithDuration: number;
    };

    const driverMap = new Map<string, DriverAccumulator>();

    for (const trip of trips) {
      statusBreakdown[trip.status] += 1;
      const driverKey = trip.driverName?.trim() || 'Unassigned';
      const driver = driverMap.get(driverKey) ?? {
        driverName: driverKey,
        totalTrips: 0,
        statusCounts: {
          [TripStatus.PLANNED]: 0,
          [TripStatus.LOADING]: 0,
          [TripStatus.IN_TRANSIT]: 0,
          [TripStatus.COMPLETED]: 0,
        },
        truckRegistrations: new Set(),
        routes: new Set(),
        offices: new Set(),
        lastTripPlannedAt: undefined,
        lastStatus: undefined,
        durationMs: 0,
        completedTripsWithDuration: 0,
      };

      driver.totalTrips += 1;
      driver.statusCounts[trip.status] += 1;
      const truck = trip.truckReg?.trim();
      if (truck) {
        driver.truckRegistrations.add(truck);
      }
      if (trip.route) {
        const routeName = trip.route.name ?? '';
        const routeCode = trip.route.code ?? '';
        const routeLabel = routeName
          ? routeCode
            ? `${routeName} (${routeCode})`
            : routeName
          : routeCode || 'Unknown route';
        driver.routes.add(routeLabel);
      }
      if (trip.office) {
        const officeName = trip.office.name ?? 'Unknown office';
        const officeCode = trip.office.branchCode;
        const officeLabel = officeCode ? `${officeName} (${officeCode})` : officeName;
        driver.offices.add(officeLabel);
      }

      if (!driver.lastTripPlannedAt || trip.plannedAt > driver.lastTripPlannedAt) {
        driver.lastTripPlannedAt = trip.plannedAt;
        driver.lastStatus = trip.status;
      }

      if (trip.completedAt && trip.departedAt && trip.completedAt > trip.departedAt) {
        driver.durationMs += trip.completedAt.getTime() - trip.departedAt.getTime();
        driver.completedTripsWithDuration += 1;
      }

      driverMap.set(driverKey, driver);
    }

    const drivers = Array.from(driverMap.values())
      .sort((a, b) => a.driverName.localeCompare(b.driverName))
      .map((driver) => ({
        driverName: driver.driverName,
        totalTrips: driver.totalTrips,
        statusCounts: driver.statusCounts,
        truckRegistrations: Array.from(driver.truckRegistrations).sort(),
        routes: Array.from(driver.routes).sort(),
        offices: Array.from(driver.offices).sort(),
        lastTripPlannedAt: driver.lastTripPlannedAt?.toISOString() ?? null,
        lastStatus: driver.lastStatus ?? null,
        averageDurationMinutes: driver.completedTripsWithDuration
          ? Number((driver.durationMs / driver.completedTripsWithDuration / 60000).toFixed(2))
          : null,
      }));

    return {
      startDate: this.time.toISO(range.start),
      endDate: this.time.toISO(range.end),
      totalTrips: trips.length,
      statusBreakdown: Object.entries(statusBreakdown).map(([status, count]) => ({ status, count })),
      drivers,
      generatedAt: this.time.nowISO(),
    };
  }

  async getZictaReport(params: { startDate?: string; endDate?: string }) {
    const range = this.normalizeRange(params?.startDate, params?.endDate, 30);
    const parcels = await this.prisma.parcel.findMany({
      where: { createdAt: { gte: range.start, lte: range.end } },
      orderBy: { createdAt: 'asc' },
      include: {
        customer: true,
        receiver: true,
        office: true,
        sendingOffice: true,
        payment: true,
        TrackingCode: true,
      },
    });

    let totalDeclaredValue = 0;
    let totalPaymentAmount = 0;

    const records = parcels.map((parcel) => {
      const declaredValue = Number(parcel.value ?? 0);
      totalDeclaredValue += declaredValue;
      if (parcel.payment?.amount) {
        totalPaymentAmount += Number(parcel.payment.amount);
      }

      return {
        parcelId: parcel.id,
        parcelNumber: parcel.parcelNumber,
        trackingCode: parcel.TrackingCode?.plainTextCode ?? null,
        createdAt: parcel.createdAt.toISOString(),
        status: parcel.status,
        description: parcel.description,
        size: parcel.size,
        declaredValue,
        originOffice: parcel.sendingOffice
          ? {
              name: parcel.sendingOffice.name,
              branchCode: parcel.sendingOffice.branchCode,
            }
          : null,
        destinationOffice: parcel.office
          ? {
              name: parcel.office.name,
              branchCode: parcel.office.branchCode,
            }
          : null,
        sender: parcel.customer
          ? {
              firstName: parcel.customer.firstName,
              lastName: parcel.customer.lastName,
              phoneNumber: parcel.customer.phoneNumber,
              idNumber: parcel.customer.idNumber,
            }
          : null,
        receiver: parcel.receiver
          ? {
              firstName: parcel.receiver.firstName,
              lastName: parcel.receiver.lastName,
              phoneNumber: parcel.receiver.phoneNumber,
              idNumber: parcel.receiver.idNumber,
            }
          : null,
        payment: parcel.payment
          ? {
              amount: parcel.payment.amount,
              method: parcel.payment.method,
              reference: parcel.payment.reference,
              paidAt: parcel.payment.paidAt?.toISOString() ?? null,
            }
          : null,
      };
    });

    return {
      startDate: this.time.toISO(range.start),
      endDate: this.time.toISO(range.end),
      total: records.length,
      totalDeclaredValue: Number(totalDeclaredValue.toFixed(2)),
      totalPaymentAmount: Number(totalPaymentAmount.toFixed(2)),
      records,
      generatedAt: this.time.nowISO(),
    };
  }

  async exportRevenueReport(params: {
    startDate?: string;
    endDate?: string;
    granularity?: string;
    format?: string | null;
  }): Promise<ReportExportResult> {
    const { format: formatInput, ...filters } = params;
    const format = this.parseFormat(formatInput);
    const report = await this.getRevenueReport(filters);

    return this.exporter.export({
      format,
      fileBaseName: this.buildFileBaseName('revenue-report', report.startDate, report.endDate),
      sheetName: 'Revenue',
      columns: [
        { header: 'Period', key: 'period' },
        { header: 'Amount (ZMW)', key: 'amount' },
        { header: 'Payments', key: 'payments' },
      ],
      rows: report.data.map((row) => ({
        period: row.period,
        amount: row.amount,
        payments: row.payments,
      })),
    });
  }

  async exportParcelMovementReport(params: {
    startDate?: string;
    endDate?: string;
    format?: string | null;
  }): Promise<ReportExportResult> {
    const { format: formatInput, ...filters } = params;
    const format = this.parseFormat(formatInput);
    const report = await this.getParcelMovementReport(filters);

    return this.exporter.export({
      format,
      fileBaseName: this.buildFileBaseName('parcel-movement-report', report.startDate, report.endDate),
      sheetName: 'Parcel Movement',
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Total', key: 'total' },
        { header: 'Pending', key: 'pending' },
        { header: 'Ready For Collection', key: 'readyForCollection' },
        { header: 'Collected', key: 'collected' },
        { header: 'Complaint Box', key: 'complaintBox' },
        { header: 'Damaged', key: 'damaged' },
      ],
      rows: report.daily,
    });
  }

  async exportComplaintReport(params: {
    startDate?: string;
    endDate?: string;
    format?: string | null;
  }): Promise<ReportExportResult> {
    const { format: formatInput, ...filters } = params;
    const format = this.parseFormat(formatInput);
    const report = await this.getComplaintReport(filters);

    return this.exporter.export({
      format,
      fileBaseName: this.buildFileBaseName('complaints-report', report.startDate, report.endDate),
      sheetName: 'Complaints',
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Logged', key: 'logged' },
        { header: 'Closed', key: 'closed' },
      ],
      rows: report.daily,
    });
  }

  async exportDriverTripReport(params: {
    startDate?: string;
    endDate?: string;
    format?: string | null;
  }): Promise<ReportExportResult> {
    const { format: formatInput, ...filters } = params;
    const format = this.parseFormat(formatInput);
    const report = await this.getDriverTripReport(filters);

    return this.exporter.export({
      format,
      fileBaseName: this.buildFileBaseName('driver-trips-report', report.startDate, report.endDate),
      sheetName: 'Driver Trips',
      columns: [
        { header: 'Driver Name', key: 'driverName' },
        { header: 'Total Trips', key: 'totalTrips' },
        { header: 'Planned', key: 'planned' },
        { header: 'Loading', key: 'loading' },
        { header: 'In Transit', key: 'inTransit' },
        { header: 'Completed', key: 'completed' },
        { header: 'Avg Duration (mins)', key: 'averageDuration' },
        { header: 'Trucks', key: 'trucks' },
        { header: 'Routes', key: 'routes' },
        { header: 'Offices', key: 'offices' },
        { header: 'Last Trip', key: 'lastTrip' },
        { header: 'Last Status', key: 'lastStatus' },
      ],
      rows: report.drivers.map((driver) => ({
        driverName: driver.driverName,
        totalTrips: driver.totalTrips,
        planned: driver.statusCounts.PLANNED ?? 0,
        loading: driver.statusCounts.LOADING ?? 0,
        inTransit: driver.statusCounts.IN_TRANSIT ?? 0,
        completed: driver.statusCounts.COMPLETED ?? 0,
        averageDuration: driver.averageDurationMinutes ?? '—',
        trucks: driver.truckRegistrations.length
          ? driver.truckRegistrations.join(', ')
          : '—',
        routes: driver.routes.length ? driver.routes.join(', ') : '—',
        offices: driver.offices.length ? driver.offices.join(', ') : '—',
        lastTrip: driver.lastTripPlannedAt ?? '',
        lastStatus: driver.lastStatus ?? '—',
      })),
    });
  }

  async exportZictaReport(params: {
    startDate?: string;
    endDate?: string;
    format?: string | null;
  }): Promise<ReportExportResult> {
    const { format: formatInput, ...filters } = params;
    const format = this.parseFormat(formatInput);
    const report = await this.getZictaReport(filters);

    return this.exporter.export({
      format,
      fileBaseName: this.buildFileBaseName('zicta-report', report.startDate, report.endDate),
      sheetName: 'ZICTA',
      columns: [
        { header: 'Created At', key: 'createdAt' },
        { header: 'Tracking Code', key: 'trackingCode' },
        { header: 'Parcel #', key: 'parcelNumber' },
        { header: 'Description', key: 'description' },
        { header: 'Declared Value (ZMW)', key: 'declaredValue' },
        { header: 'Origin', key: 'origin' },
        { header: 'Destination', key: 'destination' },
        { header: 'Sender', key: 'sender' },
        { header: 'Receiver', key: 'receiver' },
        { header: 'Payment', key: 'payment' },
        { header: 'Status', key: 'status' },
      ],
      rows: report.records.map((record) => {
        const senderName = [record.sender?.firstName, record.sender?.lastName]
          .filter((part) => !!part)
          .join(' ');
        const receiverName = [record.receiver?.firstName, record.receiver?.lastName]
          .filter((part) => !!part)
          .join(' ');
        const originPieces = [] as string[];
        if (record.originOffice?.name) {
          originPieces.push(record.originOffice.name);
        }
        if (record.originOffice?.branchCode) {
          originPieces.push(`(${record.originOffice.branchCode})`);
        }

        const destinationPieces = [] as string[];
        if (record.destinationOffice?.name) {
          destinationPieces.push(record.destinationOffice.name);
        }
        if (record.destinationOffice?.branchCode) {
          destinationPieces.push(`(${record.destinationOffice.branchCode})`);
        }

        const senderPieces = [] as string[];
        if (senderName) {
          senderPieces.push(senderName.trim());
        }
        if (record.sender?.phoneNumber) {
          senderPieces.push(`· ${record.sender.phoneNumber}`);
        }

        const receiverPieces = [] as string[];
        if (receiverName) {
          receiverPieces.push(receiverName.trim());
        }
        if (record.receiver?.phoneNumber) {
          receiverPieces.push(`· ${record.receiver.phoneNumber}`);
        }

        const paymentParts = [] as string[];
        if (record.payment?.amount !== undefined && record.payment?.amount !== null) {
          const amount = Number(record.payment.amount);
          paymentParts.push(amount.toFixed(2) + ' ZMW');
        }
        if (record.payment?.method) {
          paymentParts.push(`(${record.payment.method})`);
        }

        return {
          createdAt: record.createdAt,
          trackingCode: record.trackingCode ?? '—',
          parcelNumber: record.parcelNumber,
          description: record.description ?? '—',
          declaredValue: record.declaredValue !== undefined && record.declaredValue !== null
            ? Number(record.declaredValue).toFixed(2)
            : '0.00',
          origin: originPieces.length ? originPieces.join(' ') : '—',
          destination: destinationPieces.length ? destinationPieces.join(' ') : '—',
          sender: senderPieces.length ? senderPieces.join(' ').trim() : '—',
          receiver: receiverPieces.length ? receiverPieces.join(' ').trim() : '—',
          payment: paymentParts.length ? paymentParts.join(' ') : '—',
          status: record.status,
        };
      }),
    });
  }
}
