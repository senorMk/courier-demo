import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

export interface Sider {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SidersService {
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
  ): Observable<{ data: Sider[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = (pageIndex ?? 0) + 1;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    return this._http.get<{
      data: Sider[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/v1/siders/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  create(data: Sider): Observable<Sider> {
    return this._http.post<Sider>(`${this.baseUrl}/v1/siders`, data, this.getHeader());
  }

  get(id: string): Observable<Sider> {
    return this._http.get<Sider>(`${this.baseUrl}/v1/siders/${id}`, this.getHeader());
  }

  update(id: string, data: Partial<Sider>): Observable<Sider> {
    return this._http.put<Sider>(`${this.baseUrl}/v1/siders/${id}`, data, this.getHeader());
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${this.baseUrl}/v1/siders/${id}`, this.getHeader());
  }
}
