import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";

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
  private readonly baseUrl = environment.serverURL;

  constructor(private _httpClient: HttpClient) {}

  getToken() {
    return localStorage.getItem("accessToken");
  }

  getHeader() {
    const httpOptions = {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.getToken()}`,
      }),
    };
    return httpOptions;
  }

  getCustomers(
    page: number = 1,
    pageSize: number = 10,
    search?: string
  ): Observable<{
    data: Customer[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (search && search.trim()) {
      params.set("search", search.trim());
    }

    return this._httpClient.get<{
      data: Customer[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(
      `${this.baseUrl}/v1/customers/paginated?${params.toString()}`,
      this.getHeader()
    );
  }

  createCustomer(data: Customer): Observable<Customer> {
    return this._httpClient.post<Customer>(
      `${this.baseUrl}/v1/customers/create`,
      data,
      this.getHeader()
    );
  }
}
