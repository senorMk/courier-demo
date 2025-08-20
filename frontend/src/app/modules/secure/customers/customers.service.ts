import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '.../../environments/environment';

export interface Customer {
  id?: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress?: string;
  idNumber?: string;
}

@Injectable()
export class CustomersService {
  constructor(private _httpClient: HttpClient) {}

  getCustomers(pageIndex = 0, pageSize = 10): Observable<{data: Customer[]; total: number}> {
    const params = `?page=${pageIndex}&pageSize=${pageSize}`;
    return this._httpClient.get<{data: Customer[]; total: number}>(`${environment.serverURL}/v1/customers/paginated${params}`);
  }

  createCustomer(data: Customer): Observable<Customer> {
    return this._httpClient.post<Customer>(`${environment.serverURL}/v1/customers/create`, data);
  }
}
