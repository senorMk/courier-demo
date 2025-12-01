import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SiderItem {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class SidersApiService {
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

  search(q: string): Observable<SiderItem[]> {
    return this.http.get<SiderItem[]>(`${this.baseUrl}/v1/siders/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  create(body: { firstName: string; lastName: string; phoneNumber?: string }) {
    return this.http.post(`${this.baseUrl}/v1/siders`, body, this.getHeader());
  }

  list(pageSize: number = 100): Observable<SiderItem[]> {
    const params = new URLSearchParams({ page: '1', pageSize: String(pageSize) });
    return this.http
      .get<{ data?: SiderItem[] }>(`${this.baseUrl}/v1/siders/paginated?${params.toString()}`, this.getHeader())
      .pipe(map((res) => res?.data ?? []));
  }
}
