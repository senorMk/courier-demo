import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface RouteItem {
  id?: string;
  code: string;
  name: string;
}

@Injectable()
export class RoutesService {
  private baseUrl = environment.serverURL;

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

  getRoutes(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: RouteItem[]; total: number }> {
    const params = `?page=${pageIndex}&pageSize=${pageSize}`;
    return this._httpClient.get<{ data: RouteItem[]; total: number }>(
      `${this.baseUrl}/v1/routes/paginated${params}`,
      this.getHeader()
    );
  }

  createRoute(data: RouteItem): Observable<RouteItem> {
    return this._httpClient.post<RouteItem>(
      `${this.baseUrl}/v1/routes/create`,
      data,
      this.getHeader()
    );
  }
}
