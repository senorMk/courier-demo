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

    // Check the authentication status
    return inject(AuthService)
        .check()
        .pipe(
            switchMap((authenticated) => {
                // If the user is not authenticated...
                if (!authenticated) {
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
                    return of(true);
                }

                const currentRole = roleService.role;

                if (!currentRole) {
                    return of(router.parseUrl('sign-in'));
                }

                if (allowedRoles.includes(currentRole)) {
                    return of(true);
                }

                const fallback =
                    roleService.getDefaultRoute(currentRole) || '/secure/dashboard';
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
