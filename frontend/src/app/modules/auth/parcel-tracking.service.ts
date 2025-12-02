import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ParcelTrackingInfo {
  id: string;
  parcelNumber: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  deliveredAt?: string;
  sender: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  receiver: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  destination: {
    name: string;
  };
  currentLocation?: {
    name: string;
    timestamp: string;
  };
  trackingHistory: Array<{
    status: string;
    location: string;
    timestamp: string;
    description: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ParcelTrackingService {
  private baseUrl = environment.serverURL;

  constructor(private _http: HttpClient) {}

  trackParcel(trackingNumber: string): Observable<ParcelTrackingInfo> {
    return this._http.get<ParcelTrackingInfo>(
      `${this.baseUrl}/v1/parcels/track/${encodeURIComponent(trackingNumber)}`
    );
  }
}