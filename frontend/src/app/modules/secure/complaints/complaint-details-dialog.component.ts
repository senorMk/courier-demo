import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-complaint-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h1 mat-dialog-title class="text-center font-bold text-xl">Complaint Details</h1>
    <div mat-dialog-content class="flex flex-col gap-3">
      <div>
        <div class="text-xs font-semibold uppercase text-gray-500">Tracking Code</div>
        <div class="text-sm">
          {{ data?.parcel?.TrackingCode?.plainTextCode || 'Unknown' }}
        </div>
      </div>
      <div>
        <div class="text-xs font-semibold uppercase text-gray-500">Status</div>
        <div class="text-sm">{{ data?.status }}</div>
      </div>
      <div>
        <div class="text-xs font-semibold uppercase text-gray-500">Reporter</div>
        <div class="text-sm">{{ reporterName }}</div>
      </div>
      <div>
        <div class="text-xs font-semibold uppercase text-gray-500">Created</div>
        <div class="text-sm">{{ data?.createdAt | date: 'medium' }}</div>
      </div>
      <div>
        <div class="text-xs font-semibold uppercase text-gray-500">Reason</div>
        <div class="text-sm whitespace-pre-line">{{ data?.reason || 'No reason provided' }}</div>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Close</button>
    </div>
  `,
})
export class ComplaintDetailsDialogComponent {
  readonly reporterName: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    const first = data?.reporter?.firstName ?? '';
    const last = data?.reporter?.lastName ?? '';
    const full = `${first} ${last}`.trim();
    this.reporterName = full || data?.reporter?.email || 'Unknown';
  }
}
