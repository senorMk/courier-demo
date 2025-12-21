import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import {
  ReportsApiService,
  CashierRevenueReport,
} from '../reports/reports-api.service';

@Component({
  selector: 'app-cashier-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  template: `
    <h2 mat-dialog-title>Cashier Report: {{ data.cashierName }}</h2>

    <mat-dialog-content>
      <div *ngIf="loading" class="flex justify-center p-8">
        <mat-spinner diameter="50"></mat-spinner>
      </div>

      <div *ngIf="!loading && report">
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="p-4 bg-blue-50 rounded">
            <div class="text-sm text-gray-600">Total Payments</div>
            <div class="text-2xl font-bold">{{ report.totalPayments }}</div>
          </div>
          <div class="p-4 bg-green-50 rounded">
            <div class="text-sm text-gray-600">Total Amount</div>
            <div class="text-2xl font-bold">
              ZMW {{ report.grandTotal | number : '1.2-2' }}
            </div>
          </div>
          <div class="p-4 bg-purple-50 rounded">
            <div class="text-sm text-gray-600">Date</div>
            <div class="text-sm">{{ report.startDate | date : 'short' }}</div>
          </div>
        </div>

        <h3 class="text-lg font-semibold mb-2">Recent Payments</h3>
        <div class="overflow-auto max-h-96">
          <table mat-table [dataSource]="getPayments()" class="w-full">
            <ng-container matColumnDef="paidAt">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let payment">
                {{ payment.paidAt | date : 'short' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Amount</th>
              <td mat-cell *matCellDef="let payment">
                ZMW {{ payment.amount | number : '1.2-2' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="method">
              <th mat-header-cell *matHeaderCellDef>Method</th>
              <td mat-cell *matCellDef="let payment">{{ payment.method }}</td>
            </ng-container>

            <tr
              mat-header-row
              *matHeaderRowDef="['paidAt', 'amount', 'method']"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: ['paidAt', 'amount', 'method']"></tr>
          </table>
        </div>

        <div
          *ngIf="getPayments().length === 0"
          class="text-center p-8 text-gray-500">
          No payments found for this cashier on the selected date.
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .grid {
        display: grid;
      }

      .grid-cols-3 {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .gap-4 {
        gap: 1rem;
      }

      .mb-6 {
        margin-bottom: 1.5rem;
      }

      .mb-2 {
        margin-bottom: 0.5rem;
      }

      .p-4 {
        padding: 1rem;
      }

      .p-8 {
        padding: 2rem;
      }

      .rounded {
        border-radius: 0.5rem;
      }

      .flex {
        display: flex;
      }

      .justify-center {
        justify-content: center;
      }

      .max-h-96 {
        max-height: 24rem;
      }

      .overflow-auto {
        overflow: auto;
      }

      .text-center {
        text-align: center;
      }

      table {
        width: 100%;
      }
    `,
  ],
})
export class CashierDetailDialogComponent implements OnInit {
  loading = true;
  report: CashierRevenueReport | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      cashierId: string;
      cashierName: string;
      selectedDate: string;
    },
    private dialogRef: MatDialogRef<CashierDetailDialogComponent>,
    private reportsApi: ReportsApiService
  ) {}

  ngOnInit(): void {
    this.reportsApi
      .getCashierRevenue({
        startDate: this.data.selectedDate,
        endDate: this.data.selectedDate,
        cashierId: this.data.cashierId,
      })
      .subscribe({
        next: (report) => {
          this.report = report;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load cashier report', err);
          this.loading = false;
        },
      });
  }

  getPayments(): any[] {
    if (!this.report || !this.report.data || this.report.data.length === 0) {
      return [];
    }
    return this.report.data[0]?.payments || [];
  }

  close(): void {
    this.dialogRef.close();
  }
}