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
    navigation: Navigation;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        private _fuseNavigationService: FuseNavigationService,
        private _navigationService: NavigationService,
    )
    {
    }

    ngOnInit(): void
    {
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) =>
            {
                this.navigation = navigation;
            });
    }

    ngOnDestroy(): void
    {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
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
