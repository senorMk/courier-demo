import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TripsApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  private header() {
    const token = localStorage.getItem('accessToken');
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
    };
  }

  // Returns trips in PLANNED/LOADING for current user's office on a route
  getOpenTrips(routeId: string): Observable<Array<{ id: string; driverName: string; truckReg: string; status: string; createdAt: string }>> {
    return this.http.get<Array<{ id: string; driverName: string; truckReg: string; status: string; createdAt: string }>>(
      `${this.baseUrl}/v1/trips/open?routeId=${encodeURIComponent(routeId)}`,
      this.header()
    );
  }

  // Returns in-transit trips heading to current user's office on a route (for receiver validation)
  getArrivedTrips(routeId: string): Observable<Array<{ id: string; driverName: string; truckReg: string; status: string; createdAt: string; completedAt: string }>> {
    return this.http.get<Array<{ id: string; driverName: string; truckReg: string; status: string; createdAt: string; completedAt: string }>>(
      `${this.baseUrl}/v1/trips/arrived?routeId=${encodeURIComponent(routeId)}`,
      this.header()
    );
  }
}

