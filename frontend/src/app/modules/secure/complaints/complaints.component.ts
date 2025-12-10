import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ComplaintsApiService } from './complaints-api.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { ComplaintDetailsDialogComponent } from './complaint-details-dialog.component';

@Component({
  selector: 'app-complaints',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatPaginatorModule, MatDialogModule],
  template: `
    <div class="flex flex-col gap-4" style="width: 100%; padding: 20px;">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">Complaints</h1>
        <div class="space-x-2">
          <button mat-stroked-button (click)="refresh()">Refresh</button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-white shadow rounded">
          <div class="text-xs text-gray-500">Open</div>
          <div class="text-xl font-semibold">{{ summary?.open ?? 0 }}</div>
        </div>
        <div class="p-4 bg-white shadow rounded">
          <div class="text-xs text-gray-500">Closed</div>
          <div class="text-xl font-semibold">{{ summary?.closed ?? 0 }}</div>
        </div>
        <div class="p-4 bg-white shadow rounded">
          <div class="text-xs text-gray-500">Total</div>
          <div class="text-xl font-semibold">{{ summary?.total ?? 0 }}</div>
        </div>
        <div class="p-4 bg-white shadow rounded">
          <div class="text-xs text-gray-500">Avg Resolution (mins)</div>
          <div class="text-xl font-semibold">{{ summary?.avgResolutionMinutes ?? 0 }}</div>
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
          <ng-container matColumnDef="reporter">
            <th mat-header-cell *matHeaderCellDef>Reporter</th>
            <td mat-cell *matCellDef="let r">{{ formatReporter(r.reporter) }}</td>
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
            <td mat-cell *matCellDef="let r" class="text-right space-x-2">
              <button mat-stroked-button (click)="openDetails(r)">Details</button>
              <button mat-stroked-button color="primary" (click)="close(r)" [disabled]="r.status==='CLOSED'">Resolve</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
      <mat-paginator
        [length]="totalCount"
        [pageSize]="pageSize"
        [pageIndex]="currentPageIndex"
        [pageSizeOptions]="[5, 10, 25, 50]"
        (page)="onPageChange($event)"
      ></mat-paginator>
    </div>
  `,
})
export class ComplaintsComponent implements OnInit {
  private api = inject(ComplaintsApiService);
  private dialog = inject(MatDialog);
  displayedColumns = ['code','sender','receiver','office','reporter','status','createdAt','actions'];
  rows: any[] = [];
  summary: any = null;
  totalCount = 0;
  pageSize = 10;
  currentPageIndex = 0;

  ngOnInit(): void {
    this.loadData();
    this.refreshSummary();
  }

  refresh(): void {
    this.currentPageIndex = 0;
    this.loadData(0, this.pageSize);
    this.refreshSummary();
  }

  private loadData(pageIndex: number = this.currentPageIndex, pageSize: number = this.pageSize): void {
    const apiPage = pageIndex + 1;
    this.api.list(apiPage, pageSize).subscribe({
      next: (res) => {
        this.rows = res.data || [];
        this.totalCount = Number(res.total || 0);
        this.pageSize = res.pageSize || pageSize;
        this.currentPageIndex = (res.page ?? apiPage) - 1;
      },
      error: () => {
        this.rows = [];
        this.totalCount = 0;
      },
    });
  }

  private refreshSummary(): void {
    this.api.summary().subscribe({ next: (s: any) => this.summary = s, error: () => this.summary = null });
  }

  onPageChange(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData(event.pageIndex, event.pageSize);
  }

  close(r: any) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '360px',
      data: {
        title: 'Resolve Complaint',
        message: 'Mark this complaint as resolved?',
        confirmLabel: 'Resolve',
        cancelLabel: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.api.close(r.id).subscribe({ next: () => {
        this.loadData(this.currentPageIndex, this.pageSize);
        this.refreshSummary();
      }});
    });
  }

  formatReporter(user: { firstName?: string; lastName?: string; email?: string } | null | undefined): string {
    if (!user) return 'Unknown';
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (name) return name;
    return user.email || 'Unknown';
  }

  openDetails(complaint: any): void {
    this.dialog.open(ComplaintDetailsDialogComponent, {
      data: complaint,
      width: '420px',
    });
  }
}
