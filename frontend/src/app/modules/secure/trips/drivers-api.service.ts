import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DriversApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  search(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/drivers/search?q=${encodeURIComponent(q)}`);
  }

  create(body: { firstName: string; lastName: string; phoneNumber?: string; licenseNumber?: string }) {
    return this.http.post(`${this.baseUrl}/v1/drivers`, body);
  }
}

