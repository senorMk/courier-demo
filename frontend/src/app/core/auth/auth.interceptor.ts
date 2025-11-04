import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Clone the request object
    let newReq = req.clone();

    // Define endpoints that don't require authentication
    const publicEndpoints = [
        '/api/v1/parcels/track',
    ];

    // Check if the request is to a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint =>
        req.url.includes(endpoint)
    );

    const hasToken = !!authService.accessToken;
    console.log(`🔐 [AUTH_INTERCEPTOR] ${req.method} ${req.url}`, {
        isPublicEndpoint,
        hasToken,
        willAddAuth: !isPublicEndpoint && hasToken
    });

    // Request
    //
    // If the access token exists and it's not a public endpoint, add the Authorization header.
    // The server will return a "401 Unauthorized" response if the token is expired or invalid,
    // which our response interceptor will catch and handle by logging the user out.
    // This approach is more reliable than checking token expiration locally, as it avoids
    // issues with incorrect system time on the user's machine.
    if (!isPublicEndpoint && authService.accessToken) {
        newReq = req.clone({
            headers: req.headers.set(
                'Authorization',
                'Bearer ' + authService.accessToken
            ),
        });
    }

    // Response
    return next(newReq).pipe(
        catchError((error) => {
            // Catch "401 Unauthorized" responses
            if (error instanceof HttpErrorResponse && error.status === 401) {
                console.warn('🚫 [AUTH_INTERCEPTOR] 401 Unauthorized - Signing out');
                // Sign out
                authService.signOut();

                // Reload the app
                location.reload();
            }

            return throwError(error);
        })
    );
};
