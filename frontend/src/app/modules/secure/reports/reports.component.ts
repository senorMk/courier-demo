import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoleService } from 'app/core/auth/role.service';
import { ReportType } from 'app/core/auth/role-permissions';
import {
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

  readonly revenueColumns = ['period', 'amount', 'payments'];
  readonly parcelColumns = [
    'date',
    'total',
    'pending',
    'readyForCollection',
    'collected',
    'complaintBox',
    'damaged',
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

  constructor(
    private fb: FormBuilder,
    private api: ReportsApiService,
    private roleService: RoleService
  ) {
    this.revenueForm = this.fb.group({
      start: [this.daysAgo(29)],
      end: [new Date()],
      granularity: ['daily'],
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
    const { start, end, granularity } = this.revenueForm.value;
    this.api
      .getRevenue({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
        granularity,
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
    });
    this.loadRevenue();
  }

  downloadRevenue(format: ReportDownloadFormat): void {
    if (!this.isReportAvailable('revenue') || this.downloadingRevenue) {
      return;
    }

    const { start, end, granularity } = this.revenueForm.value;
    const startDate = this.toDateParam(start);
    const endDate = this.toDateParam(end);

    this.downloadingRevenue = true;
    this.api
      .downloadRevenue(
        {
          startDate,
          endDate,
          granularity,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'revenue-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : 'csv',
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
    this.api
      .getParcelMovement({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
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

    this.downloadingParcel = true;
    this.api
      .downloadParcelMovement(
        {
          startDate,
          endDate,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'parcel-movement-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : 'csv',
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
    this.api
      .getComplaints({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
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

    this.downloadingComplaint = true;
    this.api
      .downloadComplaints(
        {
          startDate,
          endDate,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'complaints-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : 'csv',
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
    this.api
      .getDriverTrips({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
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

    this.downloadingTrips = true;
    this.api
      .downloadDriverTrips(
        {
          startDate,
          endDate,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'driver-trips-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : 'csv',
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
    this.api
      .getZicta({
        startDate: this.toDateParam(start),
        endDate: this.toDateParam(end),
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

    this.downloadingZicta = true;
    this.api
      .downloadZicta(
        {
          startDate,
          endDate,
        },
        format,
      )
      .subscribe({
        next: (blob) => {
          const fileName = this.createFileName(
            'zicta-report',
            startDate,
            endDate,
            format === 'excel' ? 'xlsx' : 'csv',
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
}
