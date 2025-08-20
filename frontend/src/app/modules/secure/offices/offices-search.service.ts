import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Office {
  id: string;
  branchCode: string;
  officeType: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OfficesSearchService {
  constructor(private _http: HttpClient) {}

  searchOffices(query: string): Observable<Office[]> {
    const baseUrl = environment.serverURL;
    return this._http.get<Office[]>(`${baseUrl}/v1/routes/offices/search?q=${encodeURIComponent(query)}`);
  }
}
