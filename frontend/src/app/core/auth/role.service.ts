import { Injectable, inject } from "@angular/core";
import { map, distinctUntilChanged } from "rxjs";
import { UserSelectionService } from "app/services/user-selection.service";
import {
  canRoleAccessFeature,
  FeatureKey,
  getDefaultRouteForRole,
  getPermittedReportTypes,
  normalizeRoleName,
  ReportType,
  RoleKey,
} from "app/core/auth/role-permissions";

@Injectable({ providedIn: "root" })
export class RoleService {
  private userSelectionService = inject(UserSelectionService);

  readonly role$ = this.userSelectionService.selectedUser$.pipe(
    map((user) => user.roleKey ?? normalizeRoleName(user.role)),
    distinctUntilChanged()
  );

  get role(): RoleKey | null {
    const current = this.userSelectionService.getCurrentUser();
    return current.roleKey ?? normalizeRoleName(current.role);
  }

  canAccess(feature: FeatureKey, role: RoleKey | null = this.role): boolean {
    return canRoleAccessFeature(role, feature);
  }

  getDefaultRoute(role: RoleKey | null = this.role): string | null {
    return getDefaultRouteForRole(role);
  }

  getPermittedReports(role: RoleKey | null = this.role): ReportType[] {
    return getPermittedReportTypes(role);
  }
}
