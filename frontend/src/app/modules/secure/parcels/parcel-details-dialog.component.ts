import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { Parcel } from "./parcels.service";

interface ParcelDetailsData {
  parcel: Parcel;
}

@Component({
  selector: "app-parcel-details-dialog",
  template: `
    <h2 mat-dialog-title style="font-size: 1.125rem; font-weight: 600;">Parcel Details</h2>
    <mat-dialog-content class="details-grid">
      <div class="row">
        <span class="label">Tracking #</span>
        <span class="value">{{ parcel.TrackingCode?.plainTextCode || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Parcel Number</span>
        <span class="value">{{ parcel.parcelNumber || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Description</span>
        <span class="value">{{ parcel.description || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Declared Value</span>
        <span class="value">ZMW {{ formatAmount(parcel.value) }}</span>
      </div>
      <div class="row">
        <span class="label">Size</span>
        <span class="value">{{ parcel.size || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Status</span>
        <span class="value">{{ parcel.status || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Created</span>
        <span class="value">{{ parcel.createdAt ? (parcel.createdAt | date: 'dd/MM/yyyy HH:mm') : "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Origin Office</span>
        <span class="value">{{ parcel.sendingOffice?.name || parcel.office?.name || "—" }}<span *ngIf="parcel.sendingOffice?.branchCode"> • {{ parcel.sendingOffice?.branchCode }}</span></span>
      </div>
      <div class="row">
        <span class="label">Destination</span>
        <span class="value">{{ parcel.office?.name || "—" }}<span *ngIf="parcel.office?.branchCode"> • {{ parcel.office?.branchCode }}</span></span>
      </div>
      <div class="section-title">Sender</div>
      <div class="row">
        <span class="label">Name</span>
        <span class="value">{{ parcel.customer?.firstName || "—" }} {{ parcel.customer?.lastName || "" }}</span>
      </div>
      <div class="row">
        <span class="label">Phone</span>
        <span class="value">{{ parcel.customer?.phoneNumber ? "+260" + parcel.customer?.phoneNumber : "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Email</span>
        <span class="value">{{ parcel.customer?.emailAddress || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">ID Number</span>
        <span class="value">{{ parcel.customer?.idNumber || "—" }}</span>
      </div>
      <div class="section-title">Receiver</div>
      <div class="row">
        <span class="label">Name</span>
        <span class="value">{{ parcel.receiver?.firstName || "—" }} {{ parcel.receiver?.lastName || "" }}</span>
      </div>
      <div class="row">
        <span class="label">Phone</span>
        <span class="value">{{ parcel.receiver?.phoneNumber ? "+260" + parcel.receiver?.phoneNumber : "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Email</span>
        <span class="value">{{ parcel.receiver?.emailAddress || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">ID Number</span>
        <span class="value">{{ parcel.receiver?.idNumber || "—" }}</span>
      </div>
      <div class="section-title">Payment</div>
      <div class="row">
        <span class="label">Method</span>
        <span class="value">{{ parcel.payment?.method || "—" }}</span>
      </div>
      <div class="row">
        <span class="label">Amount</span>
        <span class="value">{{ parcel.payment?.amount !== undefined && parcel.payment?.amount !== null ? ('ZMW ' + formatAmount(parcel.payment?.amount)) : '—' }}</span>
      </div>
      <div class="row">
        <span class="label">Reference</span>
        <span class="value">{{ parcel.payment?.reference || "—" }}</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .details-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }
      .label {
        font-weight: 600;
        color: #334155;
      }
      .value {
        text-align: right;
        color: #1f2937;
      }
      .section-title {
        margin-top: 12px;
        font-weight: 700;
        color: #1d4ed8;
      }
    `,
  ],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class ParcelDetailsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) private readonly data: ParcelDetailsData) {}

  get parcel(): Parcel {
    return (this.data?.parcel ?? {}) as Parcel;
  }

  formatAmount(value?: number | null): string {
    if (value === null || value === undefined) {
      return "0.00";
    }
    return Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
