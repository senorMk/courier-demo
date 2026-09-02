import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Customer {
  id: string;
  firstName: string;
  lastName?: string | null;
  phoneNumber: string;
  emailAddress?: string | null;
  idNumber?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CustomersSearchService {
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

  searchCustomers(query: string): Observable<Customer[]> {
    const baseUrl = environment.serverURL;
    return this._http.get<Customer[]>(`${baseUrl}/v1/customers/search?q=${encodeURIComponent(query)}`, this.getHeader());
  }
}
