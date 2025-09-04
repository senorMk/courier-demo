import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

  search(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/drivers/search?q=${encodeURIComponent(q)}`, this.getHeader());
  }

  create(body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    return this.http.post(`${this.baseUrl}/v1/drivers`, body, this.getHeader());
  }
}
