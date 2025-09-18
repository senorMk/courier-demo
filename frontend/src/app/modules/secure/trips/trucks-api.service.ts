import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TruckItem {
  id: string;
  registration: string;
  make?: string;
  model?: string;
  capacity?: number;
}

@Injectable({ providedIn: 'root' })
export class TrucksApiService {
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

  search(q: string): Observable<TruckItem[]> {
    return this.http.get<TruckItem[]>(`${this.baseUrl}/v1/trucks/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  create(body: { registration: string; make?: string; model?: string; capacity?: number }) {
    return this.http.post(`${this.baseUrl}/v1/trucks`, body, this.getHeader());
  }

  list(pageSize: number = 100): Observable<TruckItem[]> {
    const params = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
    return this.http
      .get<{ data?: TruckItem[] }>(`${this.baseUrl}/v1/trucks/paginated?${params.toString()}`, this.getHeader())
      .pipe(map((res) => res?.data ?? []));
  }
}
