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
    page: number = 1,
    pageSize: number = 10
  ): Observable<{ data: RouteItem[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    return this._httpClient.get<{
      data: RouteItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/v1/routes/paginated?${query.toString()}`,
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
