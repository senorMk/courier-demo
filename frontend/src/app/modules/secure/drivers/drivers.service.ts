import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Driver {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  licenseNumber?: string;
  createdAt?: string;
}

@Injectable()
export class DriversService {
  private readonly baseUrl = environment.serverURL;

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

  list(
    pageIndex = 0,
    pageSize = 10
  ): Observable<{ data: Driver[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = (pageIndex ?? 0) + 1;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return this._http.get<{
      data: Driver[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/v1/drivers/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  create(data: Driver): Observable<Driver> {
    return this._http.post<Driver>(`${this.baseUrl}/v1/drivers`, data, this.getHeader());
  }

  get(id: string): Observable<Driver> {
    return this._http.get<Driver>(`${this.baseUrl}/v1/drivers/${id}`, this.getHeader());
  }

  update(id: string, data: Partial<Driver>): Observable<Driver> {
    return this._http.put<Driver>(`${this.baseUrl}/v1/drivers/${id}`, data, this.getHeader());
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${this.baseUrl}/v1/drivers/${id}`, this.getHeader());
  }
}
