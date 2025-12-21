import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import {
  SupervisorDashboardService,
  CashierMetric,
} from './supervisor-dashboard.service';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  templateUrl: './supervisor-dashboard.component.html',
  styleUrls: ['./supervisor-dashboard.component.scss'],
})
export class SupervisorDashboardComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  // Widgets
  branchRevenueToday = 0;
  parcelsToday = 0;
  cancelledCount = 0;
  cancelledRevenueToday = 0;
  netRevenue = 0;

  // Date picker
  selectedDate = new FormControl(new Date());
  maxDate = new Date(); // Maximum date for date picker (today)

  // Cashier table
  displayedColumns: string[] = [
    'cashierName',
    'parcelsToday',
    'revenueToday',
    'cancelledToday',
    'netToday',
    'actions',
  ];
  dataSource = new MatTableDataSource<CashierMetric>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = false;
  downloading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private service: SupervisorDashboardService
  ) {}

  ngOnInit(): void {
    this.loadMetrics();

    // Listen to date changes
    this.selectedDate.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMetrics();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadMetrics(): void {
    this.loading = true;
    const dateValue = this.selectedDate.value;
    const dateString = dateValue
      ? this.formatDateToYYYYMMDD(dateValue)
      : undefined;

    this.service
      .getSupervisorMetrics(dateString)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.branchRevenueToday = response.widgets.branchRevenueToday;
          this.parcelsToday = response.widgets.parcelsToday;
          this.cancelledCount = response.widgets.cancelledCount;
          this.cancelledRevenueToday = response.widgets.cancelledRevenueToday;
          this.netRevenue = response.widgets.netRevenue;
          this.dataSource.data = response.cashiers;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load supervisor metrics', err);
          this.loading = false;
        },
      });
  }

  refreshMetrics(): void {
    this.loadMetrics();
  }

  downloadCashierReport(cashier: CashierMetric): void {
    const dateValue = this.selectedDate.value;
    const dateString = dateValue
      ? this.formatDateToYYYYMMDD(dateValue)
      : this.formatDateToYYYYMMDD(new Date());

    this.downloading = true;
    this.service
      .downloadCashierReport({
        startDate: dateString,
        endDate: dateString,
        cashierId: cashier.cashierId,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const fileName = `cashier-report-${cashier.cashierName.replace(/\s+/g, '-')}-${dateString}.xlsx`;
          this.saveBlob(blob, fileName);
          this.downloading = false;
        },
        error: (err) => {
          console.error('Failed to download cashier report', err);
          this.downloading = false;
        },
      });
  }

  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}