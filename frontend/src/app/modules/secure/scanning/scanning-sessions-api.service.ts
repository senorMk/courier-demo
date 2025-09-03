import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ScanningSessionsService {
  private baseUrl = environment.serverURL;
  constructor(private _http: HttpClient) {}

  getPaginatedSessions(page: number = 1, pageSize: number = 10): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/paginated?page=${page}&pageSize=${pageSize}`;
    return this._http.get(url);
  }

  getPaginatedScans(page: number = 1, pageSize: number = 10): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/scans/paginated?page=${page}&pageSize=${pageSize}`;
    return this._http.get(url);
  }

  startSession(payload: { routeId: string; mode: 'bag' | 'individual'; officeId?: string }): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/start`;
    return this._http.post(url, payload);
  }

  getSession(id: string): Observable<any> {
    return this._http.get(`${this.baseUrl}/v1/scanning/${id}`);
  }

  scanParcel(sessionId: string, code: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/v1/scanning/${sessionId}/scan`, { code });
  }

  closeSession(sessionId: string): Observable<any> {
    return this._http.post(`${this.baseUrl}/v1/scanning/${sessionId}/close`, {});
  }

  downloadDeliveryNote(sessionId: string) {
    const url = `${this.baseUrl}/v1/scanning/${sessionId}/delivery-note`;
    return this._http.get(url, {
      responseType: 'blob' as const,
      observe: 'response' as const,
    });
  }
}
