import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ComplaintReport,
  DriverTripReport,
  ParcelMovementReport,
  ReportsApiService,
  RevenueReport,
  ZictaReport,
} from './reports-api.service';

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

  selectedReportType: 'revenue' | 'parcel' | 'complaint' | 'trip' | 'zicta' = 'revenue';

  readonly revenueColumns = ['period', 'amount', 'payments'];
  readonly parcelColumns = ['date', 'total', 'pending', 'readyForCollection', 'collected', 'complaintBox', 'damaged'];
  readonly complaintColumns = ['date', 'logged', 'closed'];
  readonly tripColumns = ['driverName', 'totalTrips', 'planned', 'loading', 'inTransit', 'completed', 'averageDuration', 'trucks', 'routes', 'offices', 'lastTrip', 'lastStatus'];
  readonly zictaColumns = ['createdAt', 'trackingCode', 'parcelNumber', 'origin', 'destination', 'sender', 'receiver', 'payment', 'status'];

  constructor(private fb: FormBuilder, private api: ReportsApiService) {
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
    this.loadRevenue();
  }

  loadRevenue(): void {
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
    this.revenueForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
      granularity: 'daily',
    });
    this.loadRevenue();
  }

  loadParcel(): void {
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
    this.parcelForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadParcel();
  }

  loadComplaints(): void {
    this.loadingComplaint = true;
    const { start, end } = this.complaintForm.value;
    this.api
      .getComplaints({ startDate: this.toDateParam(start), endDate: this.toDateParam(end) })
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
    this.complaintForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadComplaints();
  }

  loadTrips(): void {
    this.loadingTrips = true;
    const { start, end } = this.tripForm.value;
    this.api
      .getDriverTrips({ startDate: this.toDateParam(start), endDate: this.toDateParam(end) })
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
    this.tripForm.patchValue({
      start: this.daysAgo(59),
      end: new Date(),
    });
    this.loadTrips();
  }

  loadZicta(): void {
    this.loadingZicta = true;
    const { start, end } = this.zictaForm.value;
    this.api
      .getZicta({ startDate: this.toDateParam(start), endDate: this.toDateParam(end) })
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
    this.zictaForm.patchValue({
      start: this.daysAgo(29),
      end: new Date(),
    });
    this.loadZicta();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  private toDateParam(value: Date | null | undefined): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().slice(0, 10);
  }

  private daysAgo(offset: number): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setDate(now.getDate() - offset);
    return now;
  }
}
