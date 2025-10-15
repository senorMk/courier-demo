import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ComplaintsApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  getToken() {
    return localStorage.getItem('accessToken');
  }

  getHeader() {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
    return httpOptions;
  }

  list(
    page = 1,
    pageSize = 10,
    status?: 'OPEN' | 'CLOSED'
  ): Observable<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    if (status) q.set('status', status);
    return this.http.get<{
      data: any[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`${this.baseUrl}/v1/complaints/paginated?${q.toString()}`, this.getHeader());
  }

  close(id: string) {
    return this.http.post(`${this.baseUrl}/v1/complaints/${id}/close`, {}, this.getHeader());
  }

  logGeneric(payload: { parcelId?: string; code?: string; reason?: string }) {
    return this.http.post(`${this.baseUrl}/v1/complaints/log`, payload, this.getHeader());
  }

  summary(startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    const qs = q.toString();
    return this.http.get(`${this.baseUrl}/v1/complaints/report/summary${qs ? '?' + qs : ''}`, this.getHeader());
  }
}
