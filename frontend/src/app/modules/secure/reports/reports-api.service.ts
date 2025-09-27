import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface RevenueBucket {
  period: string;
  amount: number;
  payments: number;
}

export interface RevenueReport {
  granularity: 'daily' | 'monthly';
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalPayments: number;
  data: RevenueBucket[];
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

export interface ZictaItemRow {
  id: string;
  description: string;
  quantity: number;
  value: number;
  amount: number;
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
  items: ZictaItemRow[];
  totals: {
    declaredValue: number;
    lineAmount: number;
  };
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

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private baseUrl = `${environment.serverURL}/v1/reports`;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
  }

  getRevenue(params: { startDate?: string; endDate?: string; granularity?: 'daily' | 'monthly' }): Observable<RevenueReport> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    if (params.granularity) q.set('granularity', params.granularity);
    const qs = q.toString();
    return this.http.get<RevenueReport>(`${this.baseUrl}/revenue${qs ? '?' + qs : ''}`, this.getHeaders());
  }

  getParcelMovement(params: { startDate?: string; endDate?: string }): Observable<ParcelMovementReport> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    const qs = q.toString();
    return this.http.get<ParcelMovementReport>(`${this.baseUrl}/parcel-movement${qs ? '?' + qs : ''}`, this.getHeaders());
  }

  getComplaints(params: { startDate?: string; endDate?: string }): Observable<ComplaintReport> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    const qs = q.toString();
    return this.http.get<ComplaintReport>(`${this.baseUrl}/complaints${qs ? '?' + qs : ''}`, this.getHeaders());
  }

  getDriverTrips(params: { startDate?: string; endDate?: string }): Observable<DriverTripReport> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    const qs = q.toString();
    return this.http.get<DriverTripReport>(`${this.baseUrl}/driver-trips${qs ? '?' + qs : ''}`, this.getHeaders());
  }

  getZicta(params: { startDate?: string; endDate?: string }): Observable<ZictaReport> {
    const q = new URLSearchParams();
    if (params.startDate) q.set('startDate', params.startDate);
    if (params.endDate) q.set('endDate', params.endDate);
    const qs = q.toString();
    return this.http.get<ZictaReport>(`${this.baseUrl}/zicta${qs ? '?' + qs : ''}`, this.getHeaders());
  }
}
