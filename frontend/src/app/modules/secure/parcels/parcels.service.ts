import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Parcel {
  id?: string;
  parcelNumber?: number;
  customerId: string;
  receiverId: string;
  destinationId: string;
}

@Injectable()
export class ParcelsService {
  constructor(private _httpClient: HttpClient) {}

  getParcels(pageIndex = 0, pageSize = 10): Observable<{items: Parcel[]; total: number}> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{items: Parcel[]; total: number}>(`/api/v1/parcels${params}`);
  }

  createParcel(data: {customerId: string; receiverId: string; destinationId: string}): Observable<Parcel> {
    return this._httpClient.post<Parcel>(`/api/v1/parcels/create`, data);
  }
}
