import { Component, DestroyRef, OnInit, ViewChild, inject } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { ParcelsService, Parcel } from "./parcels.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ParcelDialogComponent } from "./parcel-dialog.component";
import { MatIconModule } from "@angular/material/icon";
import { SelectionModel } from "@angular/cdk/collections";
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { CommonModule } from "@angular/common";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ParcelDetailsDialogComponent } from "./parcel-details-dialog.component";
import { ComplaintsApiService } from "../complaints/complaints-api.service";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { MatDividerModule } from "@angular/material/divider";
import { ParcelComplaintDialogComponent } from "./parcel-complaint-dialog.component";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BayAuthorizationService } from "app/services/bay-authorization.service";
import { ParcelTrackDialogComponent } from "./parcel-track-dialog.component";
import { ParcelQueriesService } from "./parcel-queries.service";
import { ParcelQueryDialogComponent } from "./parcel-query-dialog.component";
import { ParcelQueriesListDialogComponent } from "./parcel-queries-list-dialog.component";
import { RoleService } from "app/core/auth/role.service";
import { CancelParcelDialogComponent } from "../dashboard/cancel-parcel-dialog.component";

@Component({
  selector: "app-parcels",
  templateUrl: "./parcels.component.html",
  styleUrls: ["./parcels.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatInputModule,
    CancelParcelDialogComponent,
  ],
})
export class ParcelsComponent implements OnInit {
  displayedColumns: string[] = [
    "select",
    "trackingCode",
    "parcelNumber",
    "description",
    "customerId",
    "receiverId",
    "destinationId",
    "status",
    "createdAt",
    "actions",
  ];
  dataSource = new MatTableDataSource<Parcel>([]);
  selection = new SelectionModel<Parcel>(false, []);
  selectedParcel: Parcel | null = null;
  total = 0;
  pageSize = 10;
  currentPageIndex = 0;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly bayAuth = inject(BayAuthorizationService);
  canCancelParcels = false;

  // Bay authorization check - only SENDING bay users can create parcels
  get canCreateParcels(): boolean {
    return this.bayAuth.canCreateParcels();
  }

  constructor(
    private _service: ParcelsService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _complaints: ComplaintsApiService,
    private _queriesService: ParcelQueriesService,
    private _roleService: RoleService
  ) {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.paginator?.firstPage();
        this.loadData(0, this.pageSize);
      });
  }

  ngOnInit(): void {
    this._roleService.role$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.canCancelParcels = role === "supervisor";
      });
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = this.pageSize): void {
    const search = this.searchControl.value.trim();
    this._service.getParcels(pageIndex, pageSize, search || undefined).subscribe((data) => {
      this.dataSource.data = data.data || [];
      this.total = Number(data.total || 0);
      this.pageSize = pageSize;
      this.currentPageIndex = pageIndex;
      this.selection.clear();
      this.selectedParcel = null;
    });
  }

  onPage(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.loadData(event.pageIndex, event.pageSize);
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(ParcelDialogComponent, {
      width: "700px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  onSelect(row: Parcel, event: MatCheckboxChange): void {
    if (event.checked) {
      this.selection.clear();
      this.selection.select(row);
      this.selectedParcel = row;
    } else {
      this.selection.deselect(row);
      this.selectedParcel = null;
    }
  }

  openDetailsDialog(): void {
    if (!this.selectedParcel) {
      return;
    }
    this._dialog.open(ParcelDetailsDialogComponent, {
      width: "520px",
      data: { parcel: this.selectedParcel },
    });
  }

  downloadReceipts(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) return;
    this._service.downloadReceiptsZip(id).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `parcel-${id}-receipts.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this._snackBar.open('Failed to download receipts', 'Close', { duration: 3000, verticalPosition: 'top' });
      }
    });
  }

  downloadReceipt(row: Parcel, type: 'original' | 'copy-of-original' | 'sticker' | 'accounts'): void {
    const id = (row as any)?.id;
    if (!id) return;
    this._service.downloadReceipt(id, type).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this._snackBar.open('Failed to download receipt', 'Close', { duration: 3000, verticalPosition: 'top' });
      }
    });
  }

  openTrackDialog(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) {
      this._snackBar.open('Parcel identifier missing', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    this._dialog.open(ParcelTrackDialogComponent, {
      width: '900px',
      data: {
        parcelId: id,
        trackingCode: (row as any)?.TrackingCode?.plainTextCode,
      },
    });
  }

  logComplaint(row: Parcel): void {
    const code = (row as any)?.TrackingCode?.plainTextCode;
    if (!code) {
      this._snackBar.open('Tracking code missing for parcel', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }
    const dialogRef = this._dialog.open(ParcelComplaintDialogComponent, {
      width: '420px',
      data: { code, sender: (row as any)?.customer, receiver: (row as any)?.receiver },
    });

    dialogRef.afterClosed().subscribe((reason?: string) => {
      if (!reason) {
        return;
      }

      this._complaints.logGeneric({ code, reason }).subscribe({
        next: () => {
          this._snackBar.open('Complaint logged', 'Close', { duration: 2500, verticalPosition: 'top' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to log complaint';
      this._snackBar.open(msg, 'Close', { duration: 3500, verticalPosition: 'top' });
        }
      });
    });
  }

  clearSearch(): void {
    if (this.searchControl.value) {
      this.searchControl.setValue('');
    }
  }

  addQuery(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) {
      this._snackBar.open('Parcel identifier missing', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    const dialogRef = this._dialog.open(ParcelQueryDialogComponent, {
      width: '500px',
      data: {
        parcelId: id,
        trackingCode: (row as any)?.TrackingCode?.plainTextCode,
        parcelNumber: row.parcelNumber,
        sender: (row as any)?.customer,
        receiver: (row as any)?.receiver,
        office: row.office,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      this._queriesService.createQuery(result).subscribe({
        next: () => {
          this._snackBar.open('Query added successfully', 'Close', { duration: 2500, verticalPosition: 'top' });
        },
        error: (err) => {
          const msg = err?.error?.message || 'Failed to add query';
          this._snackBar.open(msg, 'Close', { duration: 3500, verticalPosition: 'top' });
        },
      });
    });
  }

  viewQueries(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) {
      this._snackBar.open('Parcel identifier missing', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    this._dialog.open(ParcelQueriesListDialogComponent, {
      width: '700px',
      data: {
        parcelId: id,
        trackingCode: (row as any)?.TrackingCode?.plainTextCode,
        parcelNumber: row.parcelNumber,
      },
    });
  }

  markParcelArrived(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) {
      this._snackBar.open('Parcel identifier missing', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    this._service.markParcelArrived(id).subscribe({
      next: () => {
        this._snackBar.open('Parcel marked as arrived', 'Close', { duration: 2500, verticalPosition: 'top' });
        this.loadData(this.currentPageIndex, this.pageSize);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to mark parcel as arrived';
        this._snackBar.open(msg, 'Close', { duration: 3500, verticalPosition: 'top' });
      },
    });
  }

  sendReminder(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) {
      this._snackBar.open('Parcel identifier missing', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    if (!row.isOverdue) {
      this._snackBar.open('Parcel is not overdue yet', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    this._service.sendReminder(id).subscribe({
      next: () => {
        this._snackBar.open('Reminder sent successfully', 'Close', { duration: 2500, verticalPosition: 'top' });
        this.loadData(this.currentPageIndex, this.pageSize);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to send reminder';
        this._snackBar.open(msg, 'Close', { duration: 3500, verticalPosition: 'top' });
      },
    });
  }

  getRowClass(row: Parcel): string {
    if (row.isOverdue) {
      return 'overdue-parcel';
    }
    return '';
  }

  canCancel(parcel: Parcel): boolean {
    if (!this.canCancelParcels) {
      return false;
    }
    const status = (parcel.status || "").toUpperCase();
    return status !== "CANCELLED" && status !== "COLLECTED";
  }

  cancelParcel(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id || !this.canCancel(row)) {
      return;
    }

    const dialogRef = this._dialog.open(CancelParcelDialogComponent, {
      width: "420px",
      data: {
        parcelLabel:
          (row as any)?.TrackingCode?.plainTextCode || `Parcel #${row.parcelNumber}`,
      },
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      const reason = result?.reason?.trim();
      if (!reason) {
        return;
      }

      this._service.cancelParcel(id, reason).subscribe({
        next: () => {
          this._snackBar.open("Parcel cancelled successfully", "Close", {
            duration: 3000,
            verticalPosition: "top",
          });
          this.loadData(this.currentPageIndex, this.pageSize);
        },
        error: (err) => {
          const msg = err?.error?.message || "Failed to cancel parcel";
          this._snackBar.open(msg, "Close", {
            duration: 3500,
            verticalPosition: "top",
          });
        },
      });
    });
  }
}