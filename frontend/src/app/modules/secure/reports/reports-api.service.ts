import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RevenueBucket {
  period: string;
  amount: number;
  payments: number;
}

export interface RevenueDetailedRow {
  paymentId: string;
  trackingCode: string;
  date: string;
  period: string;
  amount: number;
  method: string;
  reference: string;
  officeName: string;
  branchCode: string;
  cashierName: string;
  cashierEmail: string;
  cashierOffice: string;
  cashierBranchCode: string;
}

export interface RevenueReport {
  granularity: 'daily' | 'monthly';
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalPayments: number;
  data: RevenueBucket[];
  detailedData: RevenueDetailedRow[];
  generatedAt: string;
}

export interface ParcelMovementDailyRow {
  date: string;
  total: number;
  pending: number;
  readyForCollection: number;
  collected: number;
  complaintBox: number;
  damaged: number;
}

export interface ParcelMovementReport {
  startDate: string;
  endDate: string;
  totalParcels: number;
  statusBreakdown: { status: string; count: number }[];
  daily: ParcelMovementDailyRow[];
  generatedAt: string;
}

export interface ComplaintDailyRow {
  date: string;
  logged: number;
  closed: number;
}

export interface ComplaintReport {
  startDate: string;
  endDate: string;
  totals: {
    open: number;
    closed: number;
    total: number;
    avgResolutionMinutes: number;
  };
  daily: ComplaintDailyRow[];
  generatedAt: string;
}

export interface DriverTripReportDriverRow {
  driverName: string;
  totalTrips: number;
  statusCounts: Record<string, number>;
  truckRegistrations: string[];
  routes: string[];
  offices: string[];
  lastTripPlannedAt: string | null;
  lastStatus: string | null;
  averageDurationMinutes: number | null;
}

export interface DriverTripReport {
  startDate: string;
  endDate: string;
  totalTrips: number;
  statusBreakdown: { status: string; count: number }[];
  drivers: DriverTripReportDriverRow[];
  generatedAt: string;
}

export interface ZictaParty {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  idNumber: string | null;
}

export interface ZictaOfficeInfo {
  name: string;
  branchCode: string | null;
}

export interface ZictaPaymentInfo {
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string | null;
}

export interface ZictaRecord {
  parcelId: string;
  parcelNumber: number;
  trackingCode: string | null;
  createdAt: string;
  status: string;
  originOffice: ZictaOfficeInfo | null;
  destinationOffice: ZictaOfficeInfo | null;
  sender: ZictaParty | null;
  receiver: ZictaParty | null;
  payment: ZictaPaymentInfo | null;
  description: string;
  size: string;
  declaredValue: number;
}

export interface ZictaReport {
  startDate: string;
  endDate: string;
  total: number;
  totalDeclaredValue: number;
  totalPaymentAmount: number;
  records: ZictaRecord[];
  generatedAt: string;
}

export interface CashierRevenueRow {
  cashierId: string;
  cashierName: string;
  cashierEmail: string;
  officeName: string;
  branchCode: string;
  totalAmount: number;
  paymentCount: number;
  payments: Array<{
    id: string;
    amount: number;
    method: string;
    paidAt: Date;
  }>;
}

export interface CashierRevenueReport {
  startDate: string;
  endDate: string;
  grandTotal: number;
  totalPayments: number;
  totalCashiers: number;
  data: CashierRevenueRow[];
  generatedAt: string;
}

export type ReportDownloadFormat = 'csv' | 'excel' | 'pdf';

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private baseUrl = `${environment.serverURL}/v1/reports`;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private createHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      return new HttpHeaders();
    }
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private buildUrl(path: string, params: Record<string, string | undefined | null>): string {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, value);
      }
    });
    const qs = query.toString();
    return `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
  }

  private download(path: string, params: Record<string, string | undefined | null>): Observable<Blob> {
    const url = this.buildUrl(path, params);
    return this.http.get(url, {
      headers: this.createHeaders(),
      responseType: 'blob',
    }) as Observable<Blob>;
  }

  getRevenue(params: { startDate?: string; endDate?: string; granularity?: 'daily' | 'monthly'; officeIds?: string[]; cashierId?: string }): Observable<RevenueReport> {
    const url = this.buildUrl('/revenue', {
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity,
      officeIds: params.officeIds?.join(','),
      cashierId: params.cashierId,
    });
    return this.http.get<RevenueReport>(url, { headers: this.createHeaders() });
  }

  getParcelMovement(params: { startDate?: string; endDate?: string; officeIds?: string[] }): Observable<ParcelMovementReport> {
    const url = this.buildUrl('/parcel-movement', {
      startDate: params.startDate,
      endDate: params.endDate,
      officeIds: params.officeIds?.join(','),
    });
    return this.http.get<ParcelMovementReport>(url, { headers: this.createHeaders() });
  }

  getComplaints(params: { startDate?: string; endDate?: string; officeIds?: string[] }): Observable<ComplaintReport> {
    const url = this.buildUrl('/complaints', {
      startDate: params.startDate,
      endDate: params.endDate,
      officeIds: params.officeIds?.join(','),
    });
    return this.http.get<ComplaintReport>(url, { headers: this.createHeaders() });
  }

  getDriverTrips(params: { startDate?: string; endDate?: string; officeIds?: string[] }): Observable<DriverTripReport> {
    const url = this.buildUrl('/driver-trips', {
      startDate: params.startDate,
      endDate: params.endDate,
      officeIds: params.officeIds?.join(','),
    });
    return this.http.get<DriverTripReport>(url, { headers: this.createHeaders() });
  }

  getZicta(params: { startDate?: string; endDate?: string; officeIds?: string[] }): Observable<ZictaReport> {
    const url = this.buildUrl('/zicta', {
      startDate: params.startDate,
      endDate: params.endDate,
      officeIds: params.officeIds?.join(','),
    });
    return this.http.get<ZictaReport>(url, { headers: this.createHeaders() });
  }

  downloadRevenue(params: { startDate?: string; endDate?: string; granularity?: 'daily' | 'monthly'; officeIds?: string[]; cashierId?: string }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/revenue/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity,
      format,
      officeIds: params.officeIds?.join(','),
      cashierId: params.cashierId,
    });
  }

  downloadParcelMovement(params: { startDate?: string; endDate?: string; officeIds?: string[] }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/parcel-movement/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      format,
      officeIds: params.officeIds?.join(','),
    });
  }

  downloadComplaints(params: { startDate?: string; endDate?: string; officeIds?: string[] }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/complaints/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      format,
      officeIds: params.officeIds?.join(','),
    });
  }

  downloadDriverTrips(params: { startDate?: string; endDate?: string; officeIds?: string[] }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/driver-trips/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      format,
      officeIds: params.officeIds?.join(','),
    });
  }

  downloadZicta(params: { startDate?: string; endDate?: string; officeIds?: string[] }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/zicta/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      format,
      officeIds: params.officeIds?.join(','),
    });
  }

  getCashierRevenue(params: { startDate?: string; endDate?: string; cashierId?: string; officeIds?: string[] }): Observable<CashierRevenueReport> {
    const url = this.buildUrl('/cashier-revenue', {
      startDate: params.startDate,
      endDate: params.endDate,
      cashierId: params.cashierId,
      officeIds: params.officeIds?.join(','),
    });
    return this.http.get<CashierRevenueReport>(url, { headers: this.createHeaders() });
  }

  downloadCashierRevenue(params: { startDate?: string; endDate?: string; cashierId?: string; officeIds?: string[] }, format: ReportDownloadFormat): Observable<Blob> {
    return this.download('/cashier-revenue/export', {
      startDate: params.startDate,
      endDate: params.endDate,
      cashierId: params.cashierId,
      format,
      officeIds: params.officeIds?.join(','),
    });
  }
}