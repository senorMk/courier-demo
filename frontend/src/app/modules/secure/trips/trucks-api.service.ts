import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  search(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/trucks/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  create(body: { registration: string; make?: string; model?: string; capacity?: number }) {
    return this.http.post(`${this.baseUrl}/v1/trucks`, body, this.getHeader());
  }
}
