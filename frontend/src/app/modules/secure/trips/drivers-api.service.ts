import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DriverItem {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  licenseNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class DriversApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  getToken() {
    return localStorage.getItem('accessToken');
  }

  getHeader() {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
    return httpOptions;
  }

  search(q: string): Observable<DriverItem[]> {
    return this.http.get<DriverItem[]>(`${this.baseUrl}/v1/drivers/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  create(body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    return this.http.post(`${this.baseUrl}/v1/drivers`, body, this.getHeader());
  }

  list(pageSize: number = 100): Observable<DriverItem[]> {
    const params = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
    return this.http
      .get<{ data?: DriverItem[] }>(`${this.baseUrl}/v1/drivers/paginated?${params.toString()}`, this.getHeader())
      .pipe(map((res) => res?.data ?? []));
  }
}
