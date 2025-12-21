import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { UserService } from "app/core/user/user.service";
import { environment } from "../../../environments/environment";
import { catchError, Observable, of, switchMap, throwError, tap } from "rxjs";
import { UserSelectionService } from "app/services/user-selection.service";
import { decodeJwt } from "../utils/jwt.util";
import { OfficesSearchService } from "app/modules/secure/trips/offices-search.service";
import { ViewModeService } from "app/services/view-mode.service";
import { BusinessDayService } from "app/services/business-day.service";

@Injectable({ providedIn: "root" })
export class AuthService {
  private _authenticated: boolean = false;
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);
  private userSelectionService = inject(UserSelectionService);
  private officesSearchService = inject(OfficesSearchService);
  private viewModeService = inject(ViewModeService);
  private businessDayService = inject(BusinessDayService);

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setter & getter for access token
   */
  set accessToken(token: string) {
    localStorage.setItem("accessToken", token);
  }

  get accessToken(): string {
    return localStorage.getItem("accessToken") ?? "";
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Forgot password
   *
   * @param email
   */
  forgotPassword(email: string): Observable<any> {
    return this._httpClient.post("api/auth/forgot-password", email);
  }

  /**
   * Reset password
   *
   * @param password
   */
  resetPassword(password: string): Observable<any> {
    return this._httpClient.post("api/auth/reset-password", password);
  }

  /**
   * Sign in
   *
   * @param credentials
   */
  signIn(credentials: { email: string; password: string }): Observable<any> {
    // Throw error, if the user is already logged in
    if (this._authenticated) {
      return throwError("User is already logged in.");
    }

    return this._httpClient
      .post(environment.serverURL + "/v1/auth/login", credentials)
      .pipe(
        switchMap((response: any) => {
          // Store the access token in the local storage
          this.accessToken = response.access_token;

          // Set the authenticated flag to true
          this._authenticated = true;

          // Store the user on the user service
          this._userService.user = response.user;

          const payload = decodeJwt(response.access_token);

          const baseUser = {
            role: payload.role,
            token: response.access_token,
            email: payload.email,
            createdAt: response.createdAt,
            userId: payload.sub,
            firstName: response.firstName,
            lastName: response.lastName,
            authorizedBayTypes: payload.authorizedBayTypes || [],
            officeId: payload.officeId,
            officeName: '', // Will be fetched below
          };

          this.userSelectionService.setUser(baseUser);

          // Initialize workspace for cashiers
          // Reset to customer view (customer-safe mode) on login
          this.viewModeService.resetToCustomerView();

          // Detect and initialize business day
          this.businessDayService.initializeNewBusinessDay();

          // Fetch office name if officeId is available
          if (payload.officeId) {
            this.officesSearchService.getById(payload.officeId).subscribe({
              next: (office) => {
                const updatedUser = {
                  ...baseUser,
                  officeName: office?.name || '',
                };
                this.userSelectionService.setUser(updatedUser);
              },
              error: () => {
                // Keep base user if office lookup fails
                this.userSelectionService.setUser(baseUser);
              },
            });
          }

          // Return a new observable with the response
          return of(response);
        })
      );
  }

  /**
   * Sign in using the access token
   */
  signInUsingToken(): Observable<any> {
    // Sign in using the token
    return this._httpClient
      .post("api/auth/sign-in-with-token", {
        accessToken: this.accessToken,
      })
      .pipe(
        catchError(() =>
          // Return false
          of(false)
        ),
        switchMap((response: any) => {
          // Replace the access token with the new one if it's available on
          // the response object.
          //
          // This is an added optional step for better security. Once you sign
          // in using the token, you should generate a new one on the server
          // side and attach it to the response object. Then the following
          // piece of code can replace the token with the refreshed one.
          if (response.access_token) {
            this.accessToken = response.access_token;
          }

          // Set the authenticated flag to true
          this._authenticated = true;

          // Store the user on the user service
          this._userService.user = response.user;

          // Return true
          return of(true);
        })
      );
  }

  /**
   * Sign out
   */
  signOut(): Observable<any> {
    // Remove the access token from the local storage
    localStorage.removeItem("accessToken");

    // Clear cached user context
    this.userSelectionService.clearUser();

    // Reset to customer view on sign out
    this.viewModeService.resetToCustomerView();

    // Set the authenticated flag to false
    this._authenticated = false;

    // Return the observable
    return of(true);
  }

  /**
   * Sign up
   *
   * @param user
   */
  signUp(user: {
    name: string;
    email: string;
    password: string;
    company: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/sign-up", user);
  }

  /**
   * Unlock session
   *
   * @param credentials
   */
  unlockSession(credentials: {
    email: string;
    password: string;
  }): Observable<any> {
    return this._httpClient.post("api/auth/unlock-session", credentials);
  }

  /**
   * Check the authentication status
   */
  check(): Observable<boolean> {
    // Check if the user is logged in
    if (this._authenticated) {
      return of(true);
    }

    // Check the access token availability
    if (!this.accessToken) {
      return of(false);
    }

    // If the access token exists, assume it's valid.
    // The server will return 401 if it's expired or invalid,
    // which will be handled by the auth interceptor.
    // This approach avoids issues with incorrect system time.
    // Completed: Implement refresh token mechanism
    return of(true);
  }
}