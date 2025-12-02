import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Truck {
  id?: string;
  registration: string;
  make?: string;
  model?: string;
  capacity?: number;
  createdAt?: string;
}

@Injectable()
export class TrucksService {
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
  ): Observable<{ data: Truck[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = (pageIndex ?? 0) + 1;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return this._http.get<{
      data: Truck[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/v1/trucks/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  create(data: Truck): Observable<Truck> {
    return this._http.post<Truck>(`${this.baseUrl}/v1/trucks`, data, this.getHeader());
  }

  get(id: string): Observable<Truck> {
    return this._http.get<Truck>(`${this.baseUrl}/v1/trucks/${id}`, this.getHeader());
  }

  update(id: string, data: Partial<Truck>): Observable<Truck> {
    return this._http.put<Truck>(`${this.baseUrl}/v1/trucks/${id}`, data, this.getHeader());
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${this.baseUrl}/v1/trucks/${id}`, this.getHeader());
  }
}
