import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule, MatSelect } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoleService } from 'app/core/auth/role.service';
import { ReportType } from 'app/core/auth/role-permissions';
import { OfficesSearchService, Office } from '../offices/offices-search.service';
import { UsersService, User } from '../users/users.service';
import {
  CashierRevenueReport,
  ComplaintReport,
  DriverTripReport,
  ParcelMovementReport,
  ReportDownloadFormat,
  ReportsApiService,
  RevenueReport,
  ZictaReport,
} from './reports-api.service';

type ReportDefinition = {
  type: ReportType;
  label: string;
};

const REPORT_DEFINITIONS: ReportDefinition[] = [
  { type: 'revenue', label: 'Revenue' },
  { type: 'parcel', label: 'Parcel Movement' },
  { type: 'complaint', label: 'Complaints' },
  { type: 'trip', label: 'Driver Trips' },
  { type: 'zicta', label: 'ZICTA' },
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
})
export class ReportsComponent implements OnInit {
  @ViewChild('officeSelect') officeSelect?: MatSelect;
  revenueForm: FormGroup;
  parcelForm: FormGroup;
  complaintForm: FormGroup;
  tripForm: FormGroup;
  zictaForm: FormGroup;

  revenueReport: RevenueReport | null = null;
  parcelReport: ParcelMovementReport | null = null;
  complaintReport: ComplaintReport | null = null;
  tripReport: DriverTripReport | null = null;
  zictaReport: ZictaReport | null = null;

  loadingRevenue = false;
  loadingParcel = false;
  loadingComplaint = false;
  loadingTrips = false;
  loadingZicta = false;

  downloadingRevenue = false;
  downloadingParcel = false;
  downloadingComplaint = false;
  downloadingTrips = false;
  downloadingZicta = false;

  selectedReportType: ReportType | null = null;
  readonly reportDefinitions = REPORT_DEFINITIONS;
  availableReportTypes: ReportType[] = [];

  // Office filter properties
  officeFilterControl: FormControl<string[]> = new FormControl([]);
  availableOffices: Office[] = [];
  selectedOfficeIds: string[] = [];
  loadingOffices = false;
  readonly allOfficesOptionValue = '__ALL_OFFICES__';

  // Cashier filter properties
  availableCashiers: User[] = [];
  loadingCashiers = false;

  readonly revenueColumns = ['period', 'amount', 'payments'];
  readonly parcelColumns = [
    'date',
    'total',
    'pending',
    'readyForCollection',
    'collected',
    'complaintBox',
    'damaged',
    'cancelled',
  ];
  readonly complaintColumns = ['date', 'logged', 'closed'];
  readonly tripColumns = [
    'driverName',
    'totalTrips',
    'planned',
    'loading',
    'inTransit',
    'completed',
    'averageDuration',
    'trucks',
    'routes',
    'offices',
    'lastTrip',
    'lastStatus',
  ];
  readonly zictaColumns = [
    'createdAt',
    'trackingCode',
    'parcelNumber',
    'description',
    'declaredValue',
    'origin',
    'destination',
    'sender',
    'receiver',
    'payment',
    'status',
  ];
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private api: ReportsApiService,
    private roleService: RoleService,
    private officesSearchService: OfficesSearchService,
    private usersService: UsersService
  ) {
    this.revenueForm = this.fb.group({
      start: [this.daysAgo(29)],
      end: [new Date()],
      granularity: ['daily'],
      cashierId: [null],
    });

    this.parcelForm = this.fb.group({
      start: [this.daysAgo(29)],
      end: [new Date()],
    });

    this.complaintForm = this.fb.group({
      start: [this.daysAgo(29)],
      end: [new Date()],
    });

    this.tripForm = this.fb.group({
      start: [this.daysAgo(59)],
      end: [new Date()],
    });

    this.zictaForm = this.fb.group({
      start: [this.daysAgo(29)],
      end: [new Date()],
    });
  }

  ngOnInit(): void {
    this.availableReportTypes = this.roleService.getPermittedReports();
    this.loadOffices();

    if (this.availableReportTypes.length === 0) {
      this.selectedReportType = null;
      return;
    }

    const initialType = this.availableReportTypes.includes('revenue')
      ? 'revenue'
      : this.availableReportTypes[0];

    this.selectedReportType = initialType;
    this.loadReportFor(initialType);
  }

  onSelectReport(type: ReportType): void {
    if (!this.isReportAvailable(type)) {
      return;
    }

    this.selectedReportType = type;
  }

  loadRevenue(): void {
    if (!this.isReportAvailable('revenue')) {
      return;
    }

    this.loadingRevenue = true;
    const { start, end, granularity, cashierId } = this.revenueForm.value;
    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;
    this.api
      .getRevenue({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        granularity,
        officeIds,
        cashierId: cashierId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.revenueReport = res;
          this.loadingRevenue = false;
        },
        error: () => {
          this.revenueReport = null;
          this.loadingRevenue = false;
        },
      });
  }

  resetRevenue(): void {
    if (!this.isReportAvailable('revenue')) {
      return;
    }

    this.revenueForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
      granularity: 'daily',
      cashierId: null,
    });
    this.loadRevenue();
  }

  downloadRevenue(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('revenue') || this.downloadingRevenue) {
      return;
    }

    const { start, end, granularity, cashierId } = this.revenueForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;

    this.downloadingRevenue = true;
    this.api
      .downloadRevenue(
        {
          startDate,
          endDate,
          granularity,
          officeIds,
          cashierId: cashierId || undefined,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'revenue-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv',
          );
          this.saveBlob(blob, fileName);
          this.downloadingRevenue = false;
        },
        error: () => {
          this.downloadingRevenue = false;
        },
      });
  }

  loadParcel(): void {
    if (!this.isReportAvailable('parcel')) {
      return;
    }

    this.loadingParcel = true;
    const { start, end } = this.parcelForm.value;
    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;
    this.api
      .getParcelMovement({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        officeIds,
      })
      .subscribe({
        next: (res) => {
          this.parcelReport = res;
          this.loadingParcel = false;
        },
        error: () => {
          this.parcelReport = null;
          this.loadingParcel = false;
        },
      });
  }

  resetParcel(): void {
    if (!this.isReportAvailable('parcel')) {
      return;
    }

    this.parcelForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadParcel();
  }

  downloadParcel(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('parcel') || this.downloadingParcel) {
      return;
    }

    const { start, end } = this.parcelForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;

    this.downloadingParcel = true;
    this.api
      .downloadParcelMovement(
        {
          startDate,
          endDate,
          officeIds,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'parcel-movement-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv',
          );
          this.saveBlob(blob, fileName);
          this.downloadingParcel = false;
        },
        error: () => {
          this.downloadingParcel = false;
        },
      });
  }

  loadComplaints(): void {
    if (!this.isReportAvailable('complaint')) {
      return;
    }

    this.loadingComplaint = true;
    const { start, end } = this.complaintForm.value;
    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;
    this.api
      .getComplaints({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        officeIds,
      })
      .subscribe({
        next: (res) => {
          this.complaintReport = res;
          this.loadingComplaint = false;
        },
        error: () => {
          this.complaintReport = null;
          this.loadingComplaint = false;
        },
      });
  }

  resetComplaints(): void {
    if (!this.isReportAvailable('complaint')) {
      return;
    }

    this.complaintForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadComplaints();
  }

  downloadComplaints(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('complaint') || this.downloadingComplaint) {
      return;
    }

    const { start, end } = this.complaintForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;

    this.downloadingComplaint = true;
    this.api
      .downloadComplaints(
        {
          startDate,
          endDate,
          officeIds,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'complaints-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv',
          );
          this.saveBlob(blob, fileName);
          this.downloadingComplaint = false;
        },
        error: () => {
          this.downloadingComplaint = false;
        },
      });
  }

  loadTrips(): void {
    if (!this.isReportAvailable('trip')) {
      return;
    }

    this.loadingTrips = true;
    const { start, end } = this.tripForm.value;
    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;
    this.api
      .getDriverTrips({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        officeIds,
      })
      .subscribe({
        next: (res) => {
          this.tripReport = res;
          this.loadingTrips = false;
        },
        error: () => {
          this.tripReport = null;
          this.loadingTrips = false;
        },
      });
  }

  resetTrips(): void {
    if (!this.isReportAvailable('trip')) {
      return;
    }

    this.tripForm.patchValue({
      start: this.daysAgo(59),
      end: new Date(),
    });
    this.loadTrips();
  }

  downloadTrips(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('trip') || this.downloadingTrips) {
      return;
    }

    const { start, end } = this.tripForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;

    this.downloadingTrips = true;
    this.api
      .downloadDriverTrips(
        {
          startDate,
          endDate,
          officeIds,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'driver-trips-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv',
          );
          this.saveBlob(blob, fileName);
          this.downloadingTrips = false;
        },
        error: () => {
          this.downloadingTrips = false;
        },
      });
  }

  loadZicta(): void {
    if (!this.isReportAvailable('zicta')) {
      return;
    }

    this.loadingZicta = true;
    const { start, end } = this.zictaForm.value;
    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;
    this.api
      .getZicta({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        officeIds,
      })
      .subscribe({
        next: (res) => {
          this.zictaReport = res;
          this.loadingZicta = false;
        },
        error: () => {
          this.zictaReport = null;
          this.loadingZicta = false;
        },
      });
  }

  resetZicta(): void {
    if (!this.isReportAvailable('zicta')) {
      return;
    }

    this.zictaForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadZicta();
  }

  downloadZicta(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('zicta') || this.downloadingZicta) {
      return;
    }

    const { start, end } = this.zictaForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    // Pass all selected office IDs for multi-office filtering
    const officeIds = this.selectedOfficeIds.length > 0 ? this.selectedOfficeIds : undefined;

    this.downloadingZicta = true;
    this.api
      .downloadZicta(
        {
          startDate,
          endDate,
          officeIds,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'zicta-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv',
          );
          this.saveBlob(blob, fileName);
          this.downloadingZicta = false;
        },
        error: () => {
          this.downloadingZicta = false;
        },
      });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  private toDateParam(value: Date | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toISOString().slice(0, 10);
  }

  private daysAgo(offset: number): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - offset);
    return now;
  }

  isReportAvailable(type: ReportType): boolean {
    return this.availableReportTypes.includes(type);
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private createFileName(
    prefix: string,
    startDate: string | undefined,
    endDate: string | undefined,
    extension: string,
  ): string {
    const start = startDate ?? 'start';
    const end = endDate ?? 'end';
    return `${prefix}_${start}_${end}.${extension}`;
  }

  private loadReportFor(type: ReportType): void {
    switch (type) {
      case 'revenue':
        this.loadRevenue();
        break;
      case 'parcel':
        this.loadParcel();
        break;
      case 'complaint':
        this.loadComplaints();
        break;
      case 'trip':
        this.loadTrips();
        break;
      case 'zicta':
        this.loadZicta();
        break;
    }
  }

  // Office filter methods
  loadOffices(): void {
    this.loadingOffices = true;
    this.officesSearchService.searchOffices('').subscribe({
      next: (offices) => {
        this.availableOffices = offices.sort((a, b) => a.name.localeCompare(b.name));
        this.loadingOffices = false;
      },
      error: () => {
        this.availableOffices = [];
        this.loadingOffices = false;
      }
    });
  }

  // Cashier filter methods
  loadCashiers(): void {
    this.loadingCashiers = true;
    // If no offices selected, load all cashiers. Otherwise, load cashiers for selected offices
    const officeId = this.selectedOfficeIds.length === 1 ? this.selectedOfficeIds[0] : undefined;

    this.usersService.getCashiers(officeId).subscribe({
      next: (cashiers) => {
        // If multiple offices are selected, filter cashiers client-side
        if (this.selectedOfficeIds.length > 1) {
          this.availableCashiers = cashiers.filter(cashier =>
            cashier.officeId && this.selectedOfficeIds.includes(cashier.officeId)
          ).sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
            return nameA.localeCompare(nameB);
          });
        } else {
          this.availableCashiers = cashiers.sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
            return nameA.localeCompare(nameB);
          });
        }
        this.loadingCashiers = false;
      },
      error: () => {
        this.availableCashiers = [];
        this.loadingCashiers = false;
      }
    });
  }

  onOfficeFilterChange(): void {
    const rawSelection = this.officeFilterControl.value || [];
    const hasAllOfficesOption = rawSelection.includes(this.allOfficesOptionValue);
    const newSelection = hasAllOfficesOption ? [] : rawSelection;

    // When "All Offices" is picked, treat it as clearing the filter and cashiers list
    if (hasAllOfficesOption) {
      this.officeFilterControl.setValue([], { emitEvent: false });
      this.officeSelect?.close(); // Explicitly close the dropdown to reflect the reset
    }
    const previousSelection = this.selectedOfficeIds;

    // Only reload if there's an actual change in selection (order-independent)
    if (this.arraysEqualIgnoreOrder(previousSelection, newSelection)) {
      return; // No change detected, skip reload
    }

    // Update selected office IDs
    this.selectedOfficeIds = newSelection;

    // Reset cashier selection when offices change
    this.revenueForm.patchValue({ cashierId: null });

    // Load or clear cashiers based on office selection
    if (newSelection.length > 0) {
      // Reload cashiers for selected offices
      this.loadCashiers();
    } else {
      // Clear cashiers when no office is selected
      this.availableCashiers = [];
      this.clearCurrentReportData();
    }

    // Reload current report with new office filter
    if (this.selectedReportType) {
      this.loadReportFor(this.selectedReportType);
    }
  }

  private arraysEqualIgnoreOrder(arr1: string[], arr2: string[]): boolean {
    // Quick length check
    if (arr1.length !== arr2.length) return false;
    
    // If both arrays are empty, they're equal
    if (arr1.length === 0) return true;
    
    // Sort both arrays and compare
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    
    return sorted1.every((val, index) => val === sorted2[index]);
  }

  private clearCurrentReportData(): void {
    // Clear all report data when filter is completely removed
    this.revenueReport = null;
    this.parcelReport = null;
    this.complaintReport = null;
    this.tripReport = null;
    this.zictaReport = null;
  }

  refreshCurrentReport(): void {
    if (!this.selectedReportType) {
      return;
    }
    
    // Reload the current report with the same filters
    this.loadReportFor(this.selectedReportType);
  }

  isRefreshing(): boolean {
    if (!this.selectedReportType) {
      return false;
    }

    // Check if any report is currently loading
    switch (this.selectedReportType) {
      case 'revenue':
        return this.loadingRevenue || this.downloadingRevenue;
      case 'parcel':
        return this.loadingParcel || this.downloadingParcel;
      case 'complaint':
        return this.loadingComplaint || this.downloadingComplaint;
      case 'trip':
        return this.loadingTrips || this.downloadingTrips;
      case 'zicta':
        return this.loadingZicta || this.downloadingZicta;
      default:
        return false;
    }
  }

  clearOfficeFilter(): void {
    this.officeFilterControl.setValue([]);
    this.selectedOfficeIds = [];

    // Clear cashiers and reset cashier selection
    this.availableCashiers = [];
    this.revenueForm.patchValue({ cashierId: null });

    // Reload current report without office filter
    if (this.selectedReportType) {
      this.loadReportFor(this.selectedReportType);
    }
  }
}