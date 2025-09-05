import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Destination {
  id?: string;
  code: string;
  name: string;
  branchCode: string;
  routeId: string;
  officeTypes?: string[];
}

@Injectable()
export class DestinationsService {
  constructor(private _httpClient: HttpClient) {}

  getToken() {
    return localStorage.getItem("accessToken");
  }

  getHeader() {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
    return httpOptions;
  }

  getDestinations(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: Destination[]; total: number }> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{ data: Destination[]; total: number }>(
      `${environment.serverURL}/v1/routes/offices/paginated${params}`,
      this.getHeader()
    );
  }

  createDestination(data: Destination): Observable<Destination> {
    return this._httpClient.post<Destination>(
      `${environment.serverURL}/v1/routes/office/create`,
      data,
      this.getHeader()
    );
  }
}
