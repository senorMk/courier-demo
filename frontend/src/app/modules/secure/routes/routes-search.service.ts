import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface RouteItem {
  id: string;
  code: string;
  name: string;
}

@Injectable({ providedIn: "root" })
export class RoutesSearchService {
  private baseUrl = environment.serverURL;
  constructor(private _http: HttpClient) {}

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

  searchRoutes(query: string): Observable<RouteItem[]> {
    return this._http.get<RouteItem[]>(
      `${this.baseUrl}/v1/routes/search?q=${encodeURIComponent(query)}`,
      this.getHeader()
    );
  }

  listRoutes(pageSize: number = 100): Observable<RouteItem[]> {
    const params = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
    return this._http
      .get<{ data?: RouteItem[] }>(
        `${this.baseUrl}/v1/routes/paginated?${params.toString()}`,
        this.getHeader()
      )
      .pipe(map((res) => res?.data ?? []));
  }
}
