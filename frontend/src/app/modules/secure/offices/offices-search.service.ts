import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Office {
  id: string;
  branchCode: string;
  officeTypes: string[];
  name: string;
  routeId?: string;
  route?: { id: string; name: string; code?: string };
}

@Injectable({ providedIn: 'root' })
export class OfficesSearchService {
  constructor(private _http: HttpClient) { }

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

  searchOffices(query: string): Observable<Office[]> {
    const baseUrl = environment.serverURL;
    return this._http.get<Office[]>(`${baseUrl}/v1/routes/offices/search?q=${encodeURIComponent(query)}`, this.getHeader());
  }

  getOffice(id: string): Observable<Office> {
    const baseUrl = environment.serverURL;
    return this._http.get<Office>(`${baseUrl}/v1/routes/offices/${id}`, this.getHeader());
  }
}
