import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ParcelDescriptionsSearchService {
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

  searchDescriptions(query: string): Observable<string[]> {
    const baseUrl = environment.serverURL;
    return this._http.get<{ descriptions: string[] }>(
      `${baseUrl}/v1/parcels/descriptions/search?q=${encodeURIComponent(query)}`,
      this.getHeader()
    ).pipe(
      map(response => response.descriptions)
    );
  }
}