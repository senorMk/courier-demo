import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '.../../environments/environment';

export interface Driver {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  licenseNumber?: string;
  createdAt?: string;
}

@Injectable()
export class DriversService {
  constructor(private _http: HttpClient) {}

  list(pageIndex = 0, pageSize = 10): Observable<{ data: Driver[]; total: number }> {
    const params = `?page=${pageIndex}&pageSize=${pageSize}`;
    return this._http.get<{ data: Driver[]; total: number }>(`${environment.serverURL}/v1/drivers/paginated${params}`);
  }

  create(data: Driver): Observable<Driver> {
    return this._http.post<Driver>(`${environment.serverURL}/v1/drivers`, data);
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${environment.serverURL}/v1/drivers/${id}`);
  }
}
