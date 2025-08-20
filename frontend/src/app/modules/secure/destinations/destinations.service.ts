import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

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

  getDestinations(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: Destination[]; total: number }> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{ data: Destination[]; total: number }>(
      `${environment.serverURL}/v1/routes/offices/paginated${params}`
    );
  }

  createDestination(data: Destination): Observable<Destination> {
    return this._httpClient.post<Destination>(
      `${environment.serverURL}/v1/routes/office/create`,
      data
    );
  }
}
