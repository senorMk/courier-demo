import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export type userRole = {
  roleName: string;
};

export type userInformation = {
  role: userRole;
  token: string;
  email: string;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
};

export let defaultUser: userInformation = {
  role: { roleName: "" },
  token: "",
  email: "",
  createdAt: "",
  userId: "",
  firstName: "",
  lastName: "",
};

@Injectable({
  providedIn: "root",
})
export class UserSelectionService {
  private selectedUserSubject = new BehaviorSubject<userInformation>(
    defaultUser
  );
  selectedUser$ = this.selectedUserSubject.asObservable();

  constructor() {
    const greenhubUserJSON = localStorage.getItem("user");
    if (greenhubUserJSON) {
      const userProfile = JSON.parse(greenhubUserJSON);
      if (userProfile) {
        this.selectedUserSubject.next(userProfile);
      } else {
        this.selectedUserSubject.next(defaultUser);
      }
    }
  }

  setUser(userProfile: any) {
    localStorage.setItem("user", JSON.stringify(userProfile));
    if (userProfile) {
      this.selectedUserSubject.next(userProfile);
    } else {
      this.selectedUserSubject.next(defaultUser);
    }
  }
}
