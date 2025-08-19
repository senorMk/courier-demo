import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RouteItem {
  id?: string;
  code: string;
  name: string;
}

@Injectable()
export class RoutesService {
  constructor(private _httpClient: HttpClient) {}

  getRoutes(pageIndex = 0, pageSize = 10): Observable<{items: RouteItem[]; total: number}> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{items: RouteItem[]; total: number}>(`/api/v1/routes${params}`);
  }

  createRoute(data: RouteItem): Observable<RouteItem> {
    return this._httpClient.post<RouteItem>(`/api/v1/routes/create`, data);
  }
}
