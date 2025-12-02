import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import {
  ParcelQueriesService,
  ParcelQuery,
  ParcelQueryStatus,
} from './parcel-queries.service';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

interface ParcelQueriesListDialogData {
  parcelId: string;
  trackingCode?: string;
  parcelNumber?: number;
}

@Component({
  selector: 'app-parcel-queries-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './parcel-queries-list-dialog.component.html',
  styleUrls: ['./parcel-queries-list-dialog.component.scss'],
})
export class ParcelQueriesListDialogComponent implements OnInit {
  queries: ParcelQuery[] = [];
  loading = true;
  error: string | null = null;
  expandedQueryId: string | null = null;
  updatingStatus: { [key: string]: boolean } = {};

  constructor(
    private dialogRef: MatDialogRef<ParcelQueriesListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParcelQueriesListDialogData,
    private queriesService: ParcelQueriesService
  ) {}

  ngOnInit(): void {
    this.loadQueries();
  }

  loadQueries(): void {
    this.loading = true;
    this.error = null;
    this.queriesService.getQueries(0, 100, undefined, this.data.parcelId).subscribe({
      next: (response) => {
        this.queries = response.data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load queries';
        this.loading = false;
        console.error('Error loading queries:', err);
      },
    });
  }

  toggleExpand(queryId: string): void {
    if (this.expandedQueryId === queryId) {
      this.expandedQueryId = null;
    } else {
      this.expandedQueryId = queryId;
      // Load events if not already loaded
      const query = this.queries.find((q) => q.id === queryId);
      if (query && !query.events) {
        this.queriesService.getQueryEvents(queryId).subscribe({
          next: (events) => {
            query.events = events;
          },
          error: (err) => {
            console.error('Error loading query events:', err);
          },
        });
      }
    }
  }

  updateStatus(queryId: string, newStatus: ParcelQueryStatus): void {
    this.updatingStatus[queryId] = true;
    this.queriesService.updateQueryStatus(queryId, { status: newStatus }).subscribe({
      next: (updatedQuery) => {
        const index = this.queries.findIndex((q) => q.id === queryId);
        if (index !== -1) {
          this.queries[index] = updatedQuery;
        }
        this.updatingStatus[queryId] = false;
        // Reload events
        this.queriesService.getQueryEvents(queryId).subscribe({
          next: (events) => {
            const query = this.queries.find((q) => q.id === queryId);
            if (query) query.events = events;
          },
        });
      },
      error: (err) => {
        this.updatingStatus[queryId] = false;
        console.error('Error updating query status:', err);
      },
    });
  }

  getStatusColor(status: ParcelQueryStatus): string {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getQueryTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      GENERAL: 'General Inquiry',
      DAMAGE: 'Damage Report',
      ROUTING_ISSUE: 'Routing Issue',
      DELAY: 'Delay',
      MISSING: 'Missing Parcel',
      DELIVERY_STATUS: 'Delivery Status',
      PAYMENT: 'Payment Issue',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }

  getStatusOptions(currentStatus: ParcelQueryStatus): ParcelQueryStatus[] {
    const allStatuses: ParcelQueryStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    return allStatuses.filter((s) => s !== currentStatus);
  }

  close(): void {
    this.dialogRef.close();
  }
}
