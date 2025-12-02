import { Component, Inject, OnInit, signal } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { ParcelsService, ParcelScanHistoryEntry, ParcelScanHistoryResponse } from "./parcels.service";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTooltipModule } from "@angular/material/tooltip";

interface TrackDialogData {
  parcelId: string;
  trackingCode?: string | null;
}

@Component({
  selector: "app-parcel-track-dialog",
  templateUrl: "./parcel-track-dialog.component.html",
  styleUrls: ["./parcel-track-dialog.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
})
export class ParcelTrackDialogComponent implements OnInit {
  loading = true;
  error: string | null = null;
  history = signal<ParcelScanHistoryEntry[]>([]);
  displayedColumns = ["sequence", "office", "bay", "user", "timestamp", "mode", "trip"];
  parcelLabel = signal<string>("Parcel Track History");

  constructor(
    private readonly parcelsService: ParcelsService,
    private readonly dialogRef: MatDialogRef<ParcelTrackDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrackDialogData,
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.error = null;
    this.parcelsService.getParcelTrackHistory(this.data.parcelId).subscribe({
      next: (resp: ParcelScanHistoryResponse) => {
        this.loading = false;
        this.history.set(resp.scans || []);
        const code = resp.parcel?.trackingCode || this.data.trackingCode || this.data.parcelId;
        this.parcelLabel.set(`Tracking history for ${code}`);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || "Unable to load tracking history";
      },
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  userName(entry: ParcelScanHistoryEntry): string {
    const first = entry.scannedBy?.firstName || "";
    const last = entry.scannedBy?.lastName || "";
    const name = `${first} ${last}`.trim();
    return name || entry.scannedBy?.email || "Unknown";
  }

  bayTypeLabel(bayType: string | null | undefined): string {
    if (!bayType) return "";

    const labels: Record<string, string> = {
      'SENDING': 'Sending Bay',
      'RECEIVING': 'Receiving Bay',
      'SORTING': 'Sorting Bay',
      'DISPATCH': 'Dispatch Bay',
    };

    return labels[bayType] || bayType;
  }
}
