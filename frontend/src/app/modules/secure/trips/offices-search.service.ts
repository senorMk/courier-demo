import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface OfficeItem {
  id: string;
  name: string;
  branchCode: string;
  routeId: string;
  route?: { id: string; name: string; code?: string };
}

@Injectable({ providedIn: 'root' })
export class OfficesSearchService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) { }

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

  search(q: string): Observable<OfficeItem[]> {
    return this.http.get<OfficeItem[]>(`${this.baseUrl}/v1/routes/offices/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  getById(id: string): Observable<OfficeItem> {
    return this.http.get<OfficeItem>(`${this.baseUrl}/v1/routes/offices/${id}`, this.getHeader());
  }
}
