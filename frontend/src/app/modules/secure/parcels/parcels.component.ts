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
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
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
import { ViewModeService } from "app/services/view-mode.service";
import { BusinessDayService } from "app/services/business-day.service";
import { MatTabsModule } from "@angular/material/tabs";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { UsersService, User } from "../users/users.service";
import { UserSelectionService } from "app/services/user-selection.service";

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
    MatTabsModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class ParcelsComponent implements OnInit {
  // Current Parcels Tab
  displayedColumns: string[] = [
    "select",
    "trackingCode",
    "parcelNumber",
    "description",
    "customerId",
    "receiverId",
    "sendingOfficeId",
    "destinationId",
    "status",
    "createdAt",
    "createdBy",
    "actions",
  ];
  dataSource = new MatTableDataSource<Parcel>([]);
  selection = new SelectionModel<Parcel>(false, []);
  selectedParcel: Parcel | null = null;
  total = 0;
  pageSize = 10;
  currentPageIndex = 0;
  @ViewChild('currentParcelsPaginator') paginator?: MatPaginator;
  readonly searchControl = new FormControl('', { nonNullable: true });

  // Parcel History Tab
  historyDataSource = new MatTableDataSource<Parcel>([]);
  historyTotal = 0;
  historyPageSize = 10;
  historyPageIndex = 0;
  @ViewChild('historyPaginator') historyPaginator?: MatPaginator;

  // History Filters
  historyFilters = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    cashierId: new FormControl<string | null>(null),
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
  });

  // Cashier filter
  availableCashiers: User[] = [];
  loadingCashiers = false;

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_TRANSIT', label: 'In Transit' },
    { value: 'ARRIVED', label: 'Arrived' },
    { value: 'COLLECTED', label: 'Collected' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  // Tab state
  selectedTabIndex = 0;

  private readonly destroyRef = inject(DestroyRef);
  private readonly bayAuth = inject(BayAuthorizationService);
  private readonly viewModeService = inject(ViewModeService);
  private readonly businessDayService = inject(BusinessDayService);
  canCancelParcels = false;
  isCustomerView = true;
  businessDayInitialized = false;

  // Bay authorization check - only SENDING bay users can create parcels
  // Supervisors are excluded from creating parcels
  get canCreateParcels(): boolean {
    const currentRole = this._roleService.role;
    if (currentRole === 'supervisor') {
      return false;
    }
    return this.bayAuth.canCreateParcels();
  }

  // Check if user is a cashier
  get isCashier(): boolean {
    const currentRole = this._roleService.role;
    return currentRole === 'cashier';
  }

  // Show table and data only in cashier view
  get showParcelsData(): boolean {
    return !this.isCustomerView;
  }

  constructor(
    private _service: ParcelsService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private _complaints: ComplaintsApiService,
    private _queriesService: ParcelQueriesService,
    private _roleService: RoleService,
    private _usersService: UsersService,
    private _userSelectionService: UserSelectionService
  ) {
    // Only trigger search when in cashier view
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (!this.isCustomerView && this.selectedTabIndex === 0) {
          this.paginator?.firstPage();
          this.loadData(0, this.pageSize);
        }
      });

    // Subscribe to history filter changes
    this.historyFilters.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (!this.isCustomerView && this.selectedTabIndex === 1) {
          this.historyPaginator?.firstPage();
          this.loadHistoryData(0, this.historyPageSize);
        }
      });
  }

  ngOnInit(): void {
    // Initialize business day
    this.businessDayService.businessDay$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((day) => {
        this.businessDayInitialized = day.initialized;
      });

    // Subscribe to role changes
    this._roleService.role$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        this.canCancelParcels = role === "supervisor";
        // Load cashiers for supervisors
        if (role === "supervisor") {
          this.loadCashiers();
        }
      });

    // Subscribe to view mode changes
    this.viewModeService.viewMode$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => {
        this.isCustomerView = mode === 'customer';

        // Load data when switching to cashier view
        if (!this.isCustomerView) {
          this.loadData();
        } else {
          // Clear data when switching to customer view
          this.dataSource.data = [];
          this.total = 0;
          this.selection.clear();
          this.selectedParcel = null;
        }
      });

    // DO NOT load data automatically - wait for user to switch to parcel view
    // This ensures customer-safe mode on login
  }

  /**
   * Format a Date object to YYYY-MM-DD string (no timezone conversion)
   */
  private formatDateToRaw(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadData(pageIndex: number = 0, pageSize: number = this.pageSize): void {
    const search = this.searchControl.value.trim();

    // Current Parcels only shows parcels created today
    // Use raw date values to avoid timezone issues
    const todayStr = this.formatDateToRaw(new Date());

    this._service.getParcels(
      pageIndex,
      pageSize,
      search || undefined,
      undefined, // no status filter for current parcels
      todayStr,
      todayStr
    ).subscribe((data) => {
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
        // Switch to parcel view and load data after creating a parcel
        if (this.isCustomerView) {
          this.viewModeService.setViewMode('cashier');
        }
        this.loadData();
      }
    });
  }

  toggleViewMode(): void {
    this.viewModeService.toggleViewMode();
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

  // History Tab Methods
  onTabChange(index: number): void {
    this.selectedTabIndex = index;

    // Load history data when switching to history tab (only if in cashier view)
    if (index === 1 && !this.isCustomerView && this.historyDataSource.data.length === 0) {
      // Don't auto-load - wait for user to apply filters
      // This ensures no totals are auto-loaded per requirements
    }
  }

  loadHistoryData(pageIndex: number = 0, pageSize: number = this.historyPageSize): void {
    const filters = this.historyFilters.value;
    const search = filters.search?.trim();
    const status = filters.status;
    const cashierId = filters.cashierId;
    const startDate = filters.startDate;
    const endDate = filters.endDate;

    // Convert dates to raw format to avoid timezone issues
    const startDateStr = startDate ? this.formatDateToRaw(startDate) : undefined;
    const endDateStr = endDate ? this.formatDateToRaw(endDate) : undefined;

    this._service.getParcels(pageIndex, pageSize, search, status, startDateStr, endDateStr, cashierId || undefined).subscribe((data) => {
      this.historyDataSource.data = data.data || [];
      this.historyTotal = Number(data.total || 0);
      this.historyPageSize = pageSize;
      this.historyPageIndex = pageIndex;
    });
  }

  onHistoryPage(event: PageEvent): void {
    this.historyPageIndex = event.pageIndex;
    this.loadHistoryData(event.pageIndex, event.pageSize);
  }

  applyHistoryFilters(): void {
    this.historyPaginator?.firstPage();
    this.loadHistoryData(0, this.historyPageSize);
  }

  clearHistoryFilters(): void {
    this.historyFilters.reset({
      search: '',
      status: '',
      cashierId: null,
      startDate: null,
      endDate: null,
    });
    this.historyDataSource.data = [];
    this.historyTotal = 0;
  }

  loadCashiers(): void {
    this.loadingCashiers = true;
    this._usersService.getCashiers().subscribe({
      next: (cashiers) => {
        this.availableCashiers = cashiers.sort((a, b) => {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
          return nameA.localeCompare(nameB);
        });
        this.loadingCashiers = false;
      },
      error: () => {
        this.availableCashiers = [];
        this.loadingCashiers = false;
      }
    });
  }

  exportHistoryCSV(): void {
    const filters = this.historyFilters.value;
    const params: any = {};

    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.startDate) {
      params.startDate = this.formatDateToRaw(filters.startDate);
    }
    if (filters.endDate) {
      params.endDate = this.formatDateToRaw(filters.endDate);
    }
    if (filters.cashierId) {
      params.cashierId = filters.cashierId;
    }

    this._service.exportParcelsCSV(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parcel-history-${this.formatDateToRaw(new Date())}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this._snackBar.open('CSV export successful', 'Close', { duration: 2500, verticalPosition: 'top' });
      },
      error: () => {
        this._snackBar.open('Failed to export CSV', 'Close', { duration: 3000, verticalPosition: 'top' });
      },
    });
  }

  exportHistoryPDF(): void {
    const filters = this.historyFilters.value;
    const params: any = {};

    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.startDate) {
      params.startDate = this.formatDateToRaw(filters.startDate);
    }
    if (filters.endDate) {
      params.endDate = this.formatDateToRaw(filters.endDate);
    }
    if (filters.cashierId) {
      params.cashierId = filters.cashierId;
    }

    this._service.exportParcelsPDF(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parcel-history-${this.formatDateToRaw(new Date())}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this._snackBar.open('PDF export successful', 'Close', { duration: 2500, verticalPosition: 'top' });
      },
      error: () => {
        this._snackBar.open('Failed to export PDF', 'Close', { duration: 3000, verticalPosition: 'top' });
      },
    });
  }

  downloadTodaysReport(): void {
    const currentUser = this._userSelectionService.getCurrentUser();
    const cashierId = currentUser.userId;

    if (!cashierId) {
      this._snackBar.open('Unable to identify cashier', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const startDateStr = this.formatDateToRaw(startOfDay);
    const endDateStr = this.formatDateToRaw(endOfDay);

    // First check if there are any parcels for today
    this._service.getParcels(0, 1, undefined, undefined, startDateStr, endDateStr, cashierId).subscribe({
      next: (response) => {
        if (response.total === 0) {
          this._snackBar.open('No parcels have been created today', 'Close', { duration: 3000, verticalPosition: 'top' });
          return;
        }

        // If there are parcels, download the report
        const params: any = {
          startDate: startDateStr,
          endDate: endDateStr,
          cashierId: cashierId,
        };

        this._service.exportParcelsCSV(params).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `todays-report-${startDateStr}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this._snackBar.open('Today\'s report downloaded successfully', 'Close', { duration: 2500, verticalPosition: 'top' });
          },
          error: () => {
            this._snackBar.open('Failed to download report', 'Close', { duration: 3000, verticalPosition: 'top' });
          },
        });
      },
      error: () => {
        this._snackBar.open('Failed to check parcels', 'Close', { duration: 3000, verticalPosition: 'top' });
      },
    });
  }
}