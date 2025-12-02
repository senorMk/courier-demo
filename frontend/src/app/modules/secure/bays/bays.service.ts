import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface Bay {
  id: string;
  name: string;
  bayType: 'SENDING' | 'RECEIVING' | 'DISPATCH';
  officeId: string;
  active: boolean;
  office?: {
    id: string;
    name: string;
    branchCode: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class BaysService {
  private apiUrl = `${environment.serverURL}/v1/bays`;

  constructor(private http: HttpClient) {}

  getBays(officeId?: string): Observable<Bay[]> {
    let params = new HttpParams();
    if (officeId) {
      params = params.set('officeId', officeId);
    }
    return this.http.get<Bay[]>(this.apiUrl, { params });
  }

  getBayById(id: string): Observable<Bay> {
    return this.http.get<Bay>(`${this.apiUrl}/${id}`);
  }

  canStartSession(bayId: string): Observable<{
    canStart: boolean;
    activeSessionsCount: number;
    maxSessions: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/${bayId}/can-start-session`);
  }
}
