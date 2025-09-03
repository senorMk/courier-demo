import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TripsApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 10, status?: string): Observable<any> {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    if (status) q.set('status', status);
    return this.http.get(`${this.baseUrl}/v1/trips?${q.toString()}`);
  }

  create(payload: { routeId: string; officeId: string; driverName: string; truckReg: string; }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips`, payload);
  }

  assign(id: string, payload: { driverName?: string; truckReg?: string; }): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/trips/${id}/assign`, payload);
  }

  start(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips/${id}/start`, {});
  }

  complete(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips/${id}/complete`, {});
  }
}

