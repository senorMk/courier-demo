import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TripsApiService {
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

  list(page = 1, pageSize = 10, status?: string): Observable<any> {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    if (status) q.set('status', status);
    return this.http.get(`${this.baseUrl}/v1/trips?${q.toString()}`, this.getHeader());
  }

  create(payload: { routeId: string; officeId: string; destinationOfficeId: string; driverName: string; truckReg: string; }): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips`, payload, this.getHeader());
  }

  assign(id: string, payload: { driverName?: string; truckReg?: string; }): Observable<any> {
    return this.http.put(`${this.baseUrl}/v1/trips/${id}/assign`, payload, this.getHeader());
  }

  start(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips/${id}/start`, {}, this.getHeader());
  }

  complete(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/v1/trips/${id}/complete`, {}, this.getHeader());
  }
}
