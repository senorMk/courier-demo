
import { MatDialog } from "@angular/material/dialog";
import { ApexOptions } from "ng-apexcharts";

import { Platform } from "@angular/cdk/platform";
import { UserService } from "app/core/user/user.service";
import { DashboardService } from "./dashboard.service";
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Navigation } from 'app/core/navigation/navigation.types';


@Component({
    selector   : 'administrator-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls  : ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy
{

    loggedInUser;
    navigation: Navigation;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    UserService: UserService;

    constructor(
        private _fuseNavigationService: FuseNavigationService,
        private _navigationService: NavigationService,
        private _userService: UserService,
      
    )
    {
    }

    ngOnInit(): void
    {
        
      let lastLogin = this.loggedInUser.lastLogin;

      

      this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) =>
            {
                this.navigation = navigation;
            }
          );
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

   // Automatically adds +1 to month result
  dateDifference(dateFrom, dateTo) {
    let rawDifference =
      dateTo.getMonth() -
      dateFrom.getMonth() +
      12 * (dateTo.getFullYear() - dateFrom.getFullYear());
    return rawDifference + 1;
  }

    openLeftDrawerMenu(): void
    {
        const mainNavigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>('mainNavigation');

        if ( mainNavigation )
        {
            mainNavigation.toggle();
        }
    }
}
