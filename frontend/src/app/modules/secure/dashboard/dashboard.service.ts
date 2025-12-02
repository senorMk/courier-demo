import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { catchError, Observable, of, switchMap, throwError } from "rxjs";
import { AuthUtils } from "app/core/auth/auth.utils";
import { UserService } from "app/core/user/user.service";
import { environment } from "../../../../environments/environment";

@Injectable()
export class DashboardService {
  private _authenticated: boolean = false;

  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private _userService: UserService
  ) {}

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

  getTripsCount(status: 'PLANNED'|'LOADING'|'IN_TRANSIT'|'COMPLETED'): Observable<number> {
    const url = `${environment.serverURL}/v1/trips?status=${status}&page=1&pageSize=1`;
    return this._httpClient.get<any>(url, this.getHeader()).pipe(
      switchMap((res) => of(Number(res?.total || 0)))
    );
  }

  getParcelsTotal(): Observable<number> {
    const url = `${environment.serverURL}/v1/parcels/paginated?page=1&pageSize=1`;
    return this._httpClient.get<any>(url, this.getHeader()).pipe(
      switchMap((res) => of(Number(res?.total || 0)))
    );
  }
}
