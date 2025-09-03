import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { ComplaintsApiService } from './complaints-api.service';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatPaginatorModule],
  template: `
    <div class="flex flex-col gap-4" style="width: 100%; padding: 20px;">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">Complaints</h1>
        <div class="space-x-2">
          <button mat-stroked-button (click)="refresh()">Refresh</button>
        </div>
      </div>

      <div class="flex flex-col flex-1 min-h-0 bg-white rounded-lg shadow-md overflow-hidden">
        <table mat-table [dataSource]="rows" style="width: 100%">
          <ng-container matColumnDef="code">
            <th mat-header-cell *matHeaderCellDef>Tracking #</th>
            <td mat-cell *matCellDef="let r">{{ r.parcel?.TrackingCode?.plainTextCode }}</td>
          </ng-container>
          <ng-container matColumnDef="sender">
            <th mat-header-cell *matHeaderCellDef>Sender</th>
            <td mat-cell *matCellDef="let r">{{ r.parcel?.customer?.firstName }} {{ r.parcel?.customer?.lastName }}</td>
          </ng-container>
          <ng-container matColumnDef="receiver">
            <th mat-header-cell *matHeaderCellDef>Receiver</th>
            <td mat-cell *matCellDef="let r">{{ r.parcel?.receiver?.firstName }} {{ r.parcel?.receiver?.lastName }}</td>
          </ng-container>
          <ng-container matColumnDef="office">
            <th mat-header-cell *matHeaderCellDef>Office</th>
            <td mat-cell *matCellDef="let r">{{ r.parcel?.office?.name }} ({{ r.parcel?.office?.branchCode }})</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let r">{{ r.status }}</td>
          </ng-container>
          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let r">{{ r.createdAt | date: 'short' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
            <td mat-cell *matCellDef="let r" class="text-right">
              <button mat-stroked-button color="primary" (click)="close(r)" [disabled]="r.status==='CLOSED'">Resolve</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
      <mat-paginator [pageSize]="10"></mat-paginator>
    </div>
  `,
})
export class ComplaintsComponent {
  private api = inject(ComplaintsApiService);
  displayedColumns = ['code','sender','receiver','office','status','createdAt','actions'];
  rows: any[] = [];

  constructor() { this.refresh(); }

  refresh() {
    this.api.list(1, 10).subscribe({ next: (res: any) => this.rows = res.data || [], error: () => this.rows = [] });
  }

  close(r: any) {
    if (!confirm('Mark complaint as resolved?')) return;
    this.api.close(r.id).subscribe({ next: () => this.refresh() });
  }
}

