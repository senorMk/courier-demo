import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Destination {
  id?: string;
  name: string;
  areaCode: string;
  branchCode: string;
  routeId: string;
  officeTypes?: string[];
  route?: { id: string; name: string; code: string };
  createdAt?: string;
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
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Observable<{ data: Destination[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (search && search.trim().length) {
      query.append("q", search.trim());
    }

    const params = `?${query.toString()}`;
    return this._httpClient.get<{
      data: Destination[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
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

  getDestination(id: string): Observable<Destination> {
    return this._httpClient.get<Destination>(
      `${environment.serverURL}/v1/routes/offices/${id}`,
      this.getHeader()
    );
  }

  updateDestination(id: string, data: Partial<Destination>): Observable<Destination> {
    return this._httpClient.put<Destination>(
      `${environment.serverURL}/v1/routes/offices/${id}`,
      data,
      this.getHeader()
    );
  }

  deleteDestination(id: string): Observable<void> {
    return this._httpClient.delete<void>(
      `${environment.serverURL}/v1/routes/offices/${id}`,
      this.getHeader()
    );
  }
}
