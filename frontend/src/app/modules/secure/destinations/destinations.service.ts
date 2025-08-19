import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Destination {
  id?: string;
  code: string;
  name: string;
  branchCode: string;
  routeId: string;
}

@Injectable()
export class DestinationsService {
  constructor(private _httpClient: HttpClient) {}

  getDestinations(pageIndex = 0, pageSize = 10): Observable<{items: Destination[]; total: number}> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{items: Destination[]; total: number}>(`/api/v1/routes/destinations${params}`);
  }

  createDestination(data: Destination): Observable<Destination> {
    return this._httpClient.post<Destination>(`/api/v1/routes/destination/create`, data);
  }
}
