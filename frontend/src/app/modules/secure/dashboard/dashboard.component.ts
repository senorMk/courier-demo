import { MatDialog } from "@angular/material/dialog";
import { ApexOptions } from "ng-apexcharts";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { Platform } from "@angular/cdk/platform";
import { MatPaginator } from "@angular/material/paginator";
import { UserService } from "app/core/user/user.service";
import { DashboardService } from "./dashboard.service";
import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { ParcelsService, Parcel } from "../parcels/parcels.service";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
  FuseNavigationService,
  FuseVerticalNavigationComponent,
} from "@fuse/components/navigation";
import { NavigationService } from "app/core/navigation/navigation.service";
import { Navigation } from "app/core/navigation/navigation.types";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { MatPaginatorModule } from "@angular/material/paginator";

@Component({
  selector: "administrator-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
})
export class DashboardComponent implements OnInit, OnDestroy {
  loggedInUser;
  navigation: Navigation;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  UserService: UserService;
  dataSource = new MatTableDataSource<Parcel>([]);
  displayedColumns: string[] = [
    "trackingCode",
    "parcelNumber",
    "customerId",
    "receiverId",
    "destinationId",
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _fuseNavigationService: FuseNavigationService,
    private _navigationService: NavigationService,
    private _userService: UserService,
    private _parcelsService: ParcelsService,
    private _dashboard: DashboardService
  ) {}

  ngOnInit(): void {
    // let lastLogin = this.loggedInUser.lastLogin;
    this._navigationService.navigation$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((navigation: Navigation) => {
        this.navigation = navigation;
      });

    this.loadData();
    this.loadSummaryCards();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._parcelsService.getParcels(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  processingCount = 0;
  inTransitCount = 0;
  deliveredCount = 0;
  totalProcessed = 0;

  loadSummaryCards() {
    // Processing: trips in LOADING
    this._dashboard.getTripsCount('LOADING').subscribe((n) => (this.processingCount = n));
    // In Transit: trips IN_TRANSIT
    this._dashboard.getTripsCount('IN_TRANSIT').subscribe((n) => (this.inTransitCount = n));
    // Delivered: trips COMPLETED (proxy for delivered)
    this._dashboard.getTripsCount('COMPLETED').subscribe((n) => (this.deliveredCount = n));
    // Total Processed: total parcels
    this._dashboard.getParcelsTotal().subscribe((n) => (this.totalProcessed = n));
  }

  ngOnDestroy(): void {
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

  openLeftDrawerMenu(): void {
    const mainNavigation =
      this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(
        "mainNavigation"
      );

    if (mainNavigation) {
      mainNavigation.toggle();
    }
  }
}
