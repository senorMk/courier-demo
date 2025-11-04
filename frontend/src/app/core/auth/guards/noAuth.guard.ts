import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

export const NoAuthGuard: CanActivateFn | CanActivateChildFn = (
    route,
    state
) => {
    const router: Router = inject(Router);

    console.log(`🚫 [NO_AUTH_GUARD] Checking access to: ${state.url}`);

    // Check the authentication status
    return inject(AuthService)
        .check()
        .pipe(
            switchMap((authenticated) => {
                console.log(`🔍 [NO_AUTH_GUARD] Authenticated: ${authenticated}`);

                // If the user is authenticated...
                if (authenticated) {
                    console.log(`🔄 [NO_AUTH_GUARD] User is authenticated, redirecting to signed-in-redirect`);
                    return of(router.parseUrl('signed-in-redirect'));
                }

                // Allow the access
                console.log(`✅ [NO_AUTH_GUARD] User not authenticated, allowing access`);
                return of(true);
            })
        );
};
