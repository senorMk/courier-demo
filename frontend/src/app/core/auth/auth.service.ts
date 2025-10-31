import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { UserService } from "app/core/user/user.service";
import { environment } from "../../../environments/environment";
import { catchError, Observable, of, switchMap, throwError } from "rxjs";
import { UserSelectionService } from "app/services/user-selection.service";
import { decodeJwt } from "../utils/jwt.util";

@Injectable({ providedIn: "root" })
export class AuthService {
  private _authenticated: boolean = false;
  private _httpClient = inject(HttpClient);
  private _userService = inject(UserService);
  private userSelectionService = inject(UserSelectionService);

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

          const payload = decodeJwt(response.access_token) || {};
          const firstName = (payload as any).firstName || "";
          const lastName = (payload as any).lastName || "";
          const fullName = [firstName, lastName]
            .map((part: string) => part?.trim())
            .filter(Boolean)
            .join(" ")
            .trim();
          const email = (payload as any).email || "";

          // Store the user on the user service
          this._userService.user = {
            id: (payload as any).sub || "",
            name: fullName || email || "Unknown User",
            email: email || "",
          };

          const user = {
            role: (payload as any).role,
            token: response.access_token,
            email,
            createdAt: (payload as any).createdAt,
            userId: (payload as any).sub,
            firstName,
            lastName,
            authorizedBayTypes: (payload as any).authorizedBayTypes || [],
          };

          this.userSelectionService.setUser(user);

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
          const token = response?.access_token || this.accessToken;
          if (response?.access_token) {
            this.accessToken = response.access_token;
          }

          // Set the authenticated flag to true
          this._authenticated = true;

          const payload = decodeJwt(token) || {};
          const firstName = (payload as any).firstName || "";
          const lastName = (payload as any).lastName || "";
          const fullName = [firstName, lastName]
            .map((part: string) => part?.trim())
            .filter(Boolean)
            .join(" ")
            .trim();
          const email = (payload as any).email || "";

          this._userService.user = {
            id: (payload as any).sub || "",
            name: fullName || email || "Unknown User",
            email: email || "",
          };

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
    // TODO: Implement refresh token mechanism
    return of(true);
  }
}
