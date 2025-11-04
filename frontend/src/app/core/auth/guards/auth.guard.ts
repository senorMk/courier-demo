import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateChildFn,
  CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { RoleService } from 'app/core/auth/role.service';
import { RoleKey } from 'app/core/auth/role-permissions';
import { of, switchMap } from 'rxjs';

export const AuthGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const roleService: RoleService = inject(RoleService);

    console.log(`🛡️ [AUTH_GUARD] Checking access to: ${state.url}`);

    // Check the authentication status
    return inject(AuthService)
        .check()
        .pipe(
            switchMap((authenticated) => {
                console.log(`🔍 [AUTH_GUARD] Authenticated: ${authenticated}`);

                // If the user is not authenticated...
                if (!authenticated) {
                    console.warn(`🚫 [AUTH_GUARD] Not authenticated, redirecting to sign-in`);
                    // Redirect to the sign-in page with a redirectUrl param
                    const redirectURL =
                        state.url === '/sign-out'
                            ? ''
                            : `redirectURL=${state.url}`;
                    const urlTree = router.parseUrl(`sign-in?${redirectURL}`);

                    return of(urlTree);
                }

                const allowedRoles = getAllowedRoles(route);

                if (!allowedRoles || allowedRoles.length === 0) {
                    console.log(`✅ [AUTH_GUARD] No role restrictions, allowing access`);
                    return of(true);
                }

                const currentRole = roleService.role;

                console.log(`👤 [AUTH_GUARD] Current role: ${currentRole}, Allowed roles:`, allowedRoles);

                if (!currentRole) {
                    console.warn(`🚫 [AUTH_GUARD] No role assigned, redirecting to sign-in`);
                    return of(router.parseUrl('sign-in'));
                }

                if (allowedRoles.includes(currentRole)) {
                    console.log(`✅ [AUTH_GUARD] Role authorized, allowing access`);
                    return of(true);
                }

                const fallback =
                    roleService.getDefaultRoute(currentRole) || '/secure/dashboard';
                console.warn(`🚫 [AUTH_GUARD] Role not authorized, redirecting to: ${fallback}`);
                const urlTree = router.parseUrl(fallback);

                return of(urlTree);
            })
        );
};

function getAllowedRoles(
    route: ActivatedRouteSnapshot
): RoleKey[] | undefined {
    for (let i = route.pathFromRoot.length - 1; i >= 0; i--) {
        const snapshot = route.pathFromRoot[i];
        const roles = snapshot.data?.['allowedRoles'] as
            | RoleKey[]
            | undefined;

        if (roles && roles.length > 0) {
            return roles;
        }
    }

    return undefined;
}
