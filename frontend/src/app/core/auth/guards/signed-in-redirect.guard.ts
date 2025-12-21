import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from 'app/core/auth/role.service';

export const SignedInRedirectGuard: CanActivateFn = () => {
    const router: Router = inject(Router);
    const roleService: RoleService = inject(RoleService);

    // Get role-based default route
    const defaultRoute = roleService.getDefaultRoute();

    console.log(`🔄 [SIGNED_IN_REDIRECT] Redirecting to role-based route: ${defaultRoute}`);

    if (defaultRoute) {
        return router.parseUrl(defaultRoute);
    }

    // Fallback to dashboard if no role found
    console.log(`⚠️ [SIGNED_IN_REDIRECT] No role found, falling back to /secure/dashboard`);
    return router.parseUrl('/secure/dashboard');
};