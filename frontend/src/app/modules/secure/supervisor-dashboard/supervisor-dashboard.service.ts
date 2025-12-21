import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CashierMetric {
  cashierId: string;
  cashierName: string;
  cashierEmail: string;
  parcelsToday: number;
  revenueToday: number;
  cancelledToday: number;
  cancelledRevenueToday: number;
  netToday: number;
}

export interface SupervisorMetricsResponse {
  date: string;
  officeId?: string;
  widgets: {
    branchRevenueToday: number;
    parcelsToday: number;
    cancelledCount: number;
    cancelledRevenueToday: number;
    netRevenue: number;
  };
  cashiers: CashierMetric[];
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SupervisorDashboardService {
  private baseUrl = `${environment.serverURL}/v1/reports`;

  constructor(private http: HttpClient) {}

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private createHeaders(): HttpHeaders {
    const token = this.getToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  getSupervisorMetrics(date?: string): Observable<SupervisorMetricsResponse> {
    const url = date
      ? `${this.baseUrl}/supervisor-metrics?date=${date}`
      : `${this.baseUrl}/supervisor-metrics`;

    return this.http.get<SupervisorMetricsResponse>(url, {
      headers: this.createHeaders(),
    });
  }

  downloadCashierReport(params: {
    startDate: string;
    endDate: string;
    cashierId: string;
  }): Observable<Blob> {
    const url = `${this.baseUrl}/revenue/export?startDate=${params.startDate}&endDate=${params.endDate}&cashierId=${params.cashierId}&format=excel`;

    return this.http.get(url, {
      headers: this.createHeaders(),
      responseType: 'blob',
    }) as Observable<Blob>;
  }
}