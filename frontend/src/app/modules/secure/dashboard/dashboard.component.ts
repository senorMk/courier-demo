import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ApexOptions } from "ng-apexcharts";
import {
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from "@fuse/components/navigation";
import { Platform } from "@angular/cdk/platform";
import { UserService } from "app/core/user/user.service";
import { DashboardService } from "./dashboard.service";

@Component({
  selector: "administrator-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
  loggedInUser;

  constructor(private _fuseNavigationService: FuseNavigationService) {}

  openLeftDrawerMenu() {
    // Get the navigation
    const navigation =
      this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
        "mainNavigation"
      );
    if (navigation) {
      // Toggle the opened status
      navigation.toggle();
    }
  }

  isRunningOnMobile() {
    // if ( this._platform.ANDROID || this._platform.IOS || !this._platform.isBrowser )
    // {
    //     return true;
    // }
    // return false;
  }

  ngOnInit(): void {
    let lastLogin = this.loggedInUser.lastLogin;
  }

  // Automatically adds +1 to month result
  dateDifference(dateFrom, dateTo) {
    let rawDifference =
      dateTo.getMonth() -
      dateFrom.getMonth() +
      12 * (dateTo.getFullYear() - dateFrom.getFullYear());
    return rawDifference + 1;
  }

  onToggleButtonChange(view: string): void {}
}
