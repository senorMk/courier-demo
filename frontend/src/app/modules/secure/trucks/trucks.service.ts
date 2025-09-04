import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '.../../environments/environment';

export interface Truck {
  id?: string;
  registration: string;
  make?: string;
  model?: string;
  capacity?: number;
  createdAt?: string;
}

@Injectable()
export class TrucksService {
  constructor(private _http: HttpClient) {}

  list(pageIndex = 0, pageSize = 10): Observable<{ data: Truck[]; total: number }> {
    const params = `?page=${pageIndex}&pageSize=${pageSize}`;
    return this._http.get<{ data: Truck[]; total: number }>(`${environment.serverURL}/v1/trucks/paginated${params}`);
  }

  create(data: Truck): Observable<Truck> {
    return this._http.post<Truck>(`${environment.serverURL}/v1/trucks`, data);
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(`${environment.serverURL}/v1/trucks/${id}`);
  }
}
