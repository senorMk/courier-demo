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
import { MatDialog } from "@angular/material/dialog";
import { CancelParcelDialogComponent } from "./cancel-parcel-dialog.component";
import { MatSnackBar } from "@angular/material/snack-bar";
import { RoleService } from "app/core/auth/role.service";

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
    CancelParcelDialogComponent,
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
    "status",
    "actions",
  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  canCancelParcels = false;
  cancellingParcelId: string | null = null;

  constructor(
    private _fuseNavigationService: FuseNavigationService,
    private _navigationService: NavigationService,
    private _userService: UserService,
    private _parcelsService: ParcelsService,
    private _dashboard: DashboardService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _roleService: RoleService
  ) {}

  ngOnInit(): void {
    // let lastLogin = this.loggedInUser.lastLogin;
    this._navigationService.navigation$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((navigation: Navigation) => {
        this.navigation = navigation;
      });

    this._roleService.role$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((role) => {
        this.canCancelParcels = role === "supervisor";
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

  canCancel(parcel: Parcel): boolean {
    if (!this.canCancelParcels) {
      return false;
    }
    const status = (parcel.status || "").toUpperCase();
    return status !== "CANCELLED" && status !== "COLLECTED";
  }

  cancelParcel(parcel: Parcel): void {
    if (!parcel?.id || !this.canCancel(parcel)) {
      return;
    }

    const dialogRef = this._dialog.open(CancelParcelDialogComponent, {
      width: "420px",
      data: {
        parcelLabel:
          parcel?.TrackingCode?.plainTextCode || `Parcel #${parcel.parcelNumber}`,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      const reason = result?.reason?.trim();
      if (!reason) {
        return;
      }

      this.cancellingParcelId = parcel.id;

      const sub = this._parcelsService.cancelParcel(parcel.id, reason).subscribe({
        next: () => {
          this._snackBar.open("Parcel cancelled", "Dismiss", { duration: 3000 });
          const index = this.paginator?.pageIndex ?? 0;
          const size = this.paginator?.pageSize ?? 10;
          this.loadData(index, size);
        },
        error: (err) => {
          const message =
            err?.error?.message || "Failed to cancel parcel. Please try again.";
          this._snackBar.open(message, "Dismiss", { duration: 4000 });
        },
      });

      sub.add(() => {
        this.cancellingParcelId = null;
      });
    });
  }
}