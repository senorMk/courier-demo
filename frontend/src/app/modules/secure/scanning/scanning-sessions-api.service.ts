import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ScanningSessionsService {
  private baseUrl = environment.serverURL;
  constructor(private _http: HttpClient) {}

  getToken() {
    return localStorage.getItem("accessToken");
  }

  getHeader() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
  }
  getPaginatedSessions(
    page: number = 1,
    pageSize: number = 10
  ): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/paginated?page=${page}&pageSize=${pageSize}`;
    return this._http.get(url, this.getHeader());
  }

  getPaginatedScans(page: number = 1, pageSize: number = 10): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/scans/paginated?page=${page}&pageSize=${pageSize}`;
    return this._http.get(url, this.getHeader());
  }

  startSession(payload: {
    routeId: string;
    mode: "bag" | "individual";
    officeId?: string;
  }): Observable<any> {
    const url = `${this.baseUrl}/v1/scanning/start`;
    return this._http.post(url, payload, this.getHeader());
  }

  getSession(id: string): Observable<any> {
    return this._http.get(
      `${this.baseUrl}/v1/scanning/${id}`,
      this.getHeader()
    );
  }

  scanParcel(sessionId: string, code: string): Observable<any> {
    return this._http.post(
      `${this.baseUrl}/v1/scanning/${sessionId}/scan`,
      { code },
      this.getHeader()
    );
  }

  closeSession(sessionId: string): Observable<any> {
    return this._http.post(
      `${this.baseUrl}/v1/scanning/${sessionId}/close`,
      {},
      this.getHeader()
    );
  }

  deleteSession(sessionId: string): Observable<any> {
    return this._http.delete(
      `${this.baseUrl}/v1/scanning/${sessionId}`,
      this.getHeader()
    );
  }

  downloadDeliveryNote(sessionId: string) {
    const url = `${this.baseUrl}/v1/scanning/${sessionId}/delivery-note`;
    return this._http.get(url, {
      responseType: "blob" as const,
      observe: "response" as const,
      ...this.getHeader(),
    });
  }
}
