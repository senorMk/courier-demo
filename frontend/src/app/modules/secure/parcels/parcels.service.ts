import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Parcel {
  id?: string;
  parcelNumber?: number;
  customerId: string;
  receiverId: string;
  destinationId: string;
}

@Injectable()
export class ParcelsService {
  private baseUrl = environment.serverURL;
  constructor(private _httpClient: HttpClient) {}

  getParcels(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: Parcel[]; total: number }> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{ data: Parcel[]; total: number }>(
      `${this.baseUrl}/v1/parcels/paginated${params}`
    );
  }

  createParcel(data: {
    customerId: string;
    receiverId: string;
    officeId: string;
  }): Observable<Parcel> {
    return this._httpClient.post<Parcel>(
      `${this.baseUrl}/v1/parcels/create`,
      data
    );
  }
}
