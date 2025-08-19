import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  getCustomers(pageIndex = 0, pageSize = 10): Observable<{items: Customer[]; total: number}> {
    const params = `?page=${pageIndex}&size=${pageSize}`;
    return this._httpClient.get<{items: Customer[]; total: number}>(`/api/v1/customers${params}`);
  }

  createCustomer(data: Customer): Observable<Customer> {
    return this._httpClient.post<Customer>(`/api/v1/customers/create`, data);
  }
}
