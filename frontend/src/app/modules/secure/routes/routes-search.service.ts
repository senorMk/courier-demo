import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
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

  searchRoutes(query: string): Observable<RouteItem[]> {
    return this._http.get<RouteItem[]>(
      `${this.baseUrl}/v1/routes/search?q=${encodeURIComponent(query)}`
    );
  }
}
