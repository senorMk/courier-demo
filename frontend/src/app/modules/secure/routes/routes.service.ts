import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface RouteItem {
  id?: string;
  code: string;
  name: string;
}

@Injectable()
export class RoutesService {
  private baseUrl = environment.apiURL;

  constructor(private _httpClient: HttpClient) {}

  getRoutes(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: RouteItem[]; total: number }> {
    const params = `?page=${pageIndex}&pageSize=${pageSize}`;
    return this._httpClient.get<{ data: RouteItem[]; total: number }>(
      `${this.baseUrl}/v1/routes/paginated${params}`
    );
  }

  createRoute(data: RouteItem): Observable<RouteItem> {
    return this._httpClient.post<RouteItem>(
      `${this.baseUrl}/v1/routes/create`,
      data
    );
  }
}
