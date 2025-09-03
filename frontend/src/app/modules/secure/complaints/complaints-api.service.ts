import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ComplaintsApiService {
  private baseUrl = environment.serverURL;
  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 10, status?: 'OPEN' | 'CLOSED'): Observable<any> {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    if (status) q.set('status', status);
    return this.http.get(`${this.baseUrl}/v1/complaints/paginated?${q.toString()}`);
  }

  close(id: string) {
    return this.http.post(`${this.baseUrl}/v1/complaints/${id}/close`, {});
  }
}
