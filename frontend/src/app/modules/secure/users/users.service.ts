import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface BayType {
  SENDING: 'SENDING';
  RECEIVING: 'RECEIVING';
  DISPATCH: 'DISPATCH';
}

export interface Role {
  id: string;
  name: string;
}

export interface Office {
  id: string;
  name: string;
  branchCode: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  officeId?: string;
  authorizedBayTypes?: string[];
  role: Role;
  office?: Office;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  officeId?: string;
  authorizedBayTypes?: string[];
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  officeId?: string;
  authorizedBayTypes?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private apiUrl = `${environment.serverURL}/v1/users`;

  constructor(private http: HttpClient) {}

  getUsers(page: number = 1, pageSize: number = 20): Observable<PaginatedResponse<User>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params });
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(this.apiUrl, dto);
  }

  updateUser(id: string, dto: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, dto);
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/roles`);
  }

  getCashiers(officeId?: string): Observable<User[]> {
    let params = new HttpParams();
    if (officeId) {
      params = params.set('officeId', officeId);
    }
    return this.http.get<User[]>(`${this.apiUrl}/cashiers`, { params });
  }
}