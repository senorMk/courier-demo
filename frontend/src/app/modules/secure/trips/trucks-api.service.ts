import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TrucksApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  search(q: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/v1/trucks/search?q=${encodeURIComponent(q)}`);
  }

  create(body: { registration: string; make?: string; model?: string; capacity?: number }) {
    return this.http.post(`${this.baseUrl}/v1/trucks`, body);
  }
}

