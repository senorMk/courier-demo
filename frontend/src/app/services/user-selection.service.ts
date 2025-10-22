import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  extractRoleName,
  normalizeRoleName,
  RoleKey,
} from "app/core/auth/role-permissions";

export interface UserInformation {
  role: string | null;
  roleKey: RoleKey | null;
  token: string;
  email: string;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
  authorizedBayTypes: string[];
}

const defaultUser: UserInformation = {
  role: null,
  roleKey: null,
  token: "",
  email: "",
  createdAt: "",
  userId: "",
  firstName: "",
  lastName: "",
  authorizedBayTypes: [],
};

@Injectable({
  providedIn: "root",
})
export class UserSelectionService {
  private selectedUserSubject = new BehaviorSubject<UserInformation>(defaultUser);
  selectedUser$ = this.selectedUserSubject.asObservable();

  constructor() {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const normalized = this.normalizeUser(parsed);
        this.selectedUserSubject.next(normalized);
      } catch (error) {
        console.warn("Failed to parse stored user profile", error);
        this.selectedUserSubject.next(defaultUser);
      }
    }
  }

  setUser(userProfile: unknown): void {
    if (!userProfile) {
      this.clearUser();
      return;
    }

    const normalized = this.normalizeUser(userProfile);
    localStorage.setItem("user", JSON.stringify(normalized));
    this.selectedUserSubject.next(normalized);
  }

  clearUser(): void {
    localStorage.removeItem("user");
    this.selectedUserSubject.next(defaultUser);
  }

  getCurrentUser(): UserInformation {
    return this.selectedUserSubject.getValue();
  }

  private normalizeUser(userProfile: any): UserInformation {
    const roleString =
      extractRoleName(userProfile?.role) ??
      extractRoleName(userProfile?.roleName) ??
      (typeof userProfile?.role === "string" ? userProfile.role : null);

    const roleKeyCandidate =
      normalizeRoleName(userProfile?.roleKey) ??
      normalizeRoleName(roleString) ??
      normalizeRoleName(userProfile?.role);

    const normalized: UserInformation = {
      role: roleString,
      roleKey: roleKeyCandidate,
      token: typeof userProfile?.token === "string" ? userProfile.token : "",
      email: typeof userProfile?.email === "string" ? userProfile.email : "",
      createdAt:
        typeof userProfile?.createdAt === "string" ? userProfile.createdAt : "",
      userId: typeof userProfile?.userId === "string" ? userProfile.userId : "",
      firstName:
        typeof userProfile?.firstName === "string" ? userProfile.firstName : "",
      lastName:
        typeof userProfile?.lastName === "string" ? userProfile.lastName : "",
      authorizedBayTypes: Array.isArray(userProfile?.authorizedBayTypes) ? userProfile.authorizedBayTypes : [],
    };

    if (!normalized.roleKey && normalized.role) {
      normalized.roleKey = normalizeRoleName(normalized.role);
    }

    return normalized;
  }
}

export { defaultUser };
