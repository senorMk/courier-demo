import { Component, effect, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ScanningSessionsService } from "../scanning-sessions-api.service";
import { MailbagSummaryComponent } from "./mailbag-summary.component";

@Component({
  selector: "scanning-workspace",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MailbagSummaryComponent,
  ],
  templateUrl: "./scanning-workspace.component.html",
})
export class ScanningWorkspaceComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ScanningSessionsService);
  private _snackBar = inject(MatSnackBar);

  sessionId = signal<string>("");
  session = signal<any | null>(null);
  barcodeInput = signal("");
  error = signal<string | null>(null);
  submitting = signal<boolean>(false);
  // Remember last code auto-submitted to avoid repeated retries
  private _lastAutoScanned: string = "";

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get("id");
      if (id) {
        this.sessionId.set(id);
        this.api.getSession(id).subscribe({
          next: (s) => this.session.set(s),
          error: () => this.session.set(null),
        });
      }
    });

    // Auto-scan when a valid tracking code is entered
    effect(() => {
      const code = this.barcodeInput().trim();
      if (!code || this.submitting()) return;
      // Avoid re-submitting the same code repeatedly when input doesn't change
      if (code === this._lastAutoScanned) return;
      if (this.looksLikeTrackingCode(code)) {
        this._lastAutoScanned = code;
        this.scan();
      }
    });
  }

  scan() {
    const code = this.barcodeInput().trim();
    if (!code) return;
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api.scanParcel(this.sessionId(), code).subscribe({
      next: () => {
        this.barcodeInput.set("");
        this.error.set(null);
        this._lastAutoScanned = "";
        // refresh session
        this.api
          .getSession(this.sessionId())
          .subscribe((s) => this.session.set(s));
        this.submitting.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || "Failed to scan");
        this._snackBar.open(this.error()!, "Close", {
          duration: 3000,
          verticalPosition: "top",
        });
        // If it's a duplicate-type error, clear input to prevent continuous retries
        const msg = (this.error() || "").toLowerCase();
        if (msg.includes("already scanned") || msg.includes("duplicate")) {
          this.barcodeInput.set("");
          this._lastAutoScanned = "";
        } else {
          // Keep the last auto-scanned marker so effect doesn't instantly retry
          // Users can edit the input to retry.
        }
        this.submitting.set(false);
      },
    });
  }

  closeSession() {
    if (!this.session()) {
      const msg = "Session not loaded or has expired";
      this.error.set(msg);
      this._snackBar.open(msg, "Close", {
        duration: 3000,
        verticalPosition: "top",
      });
      return;
    }
    this.api.closeSession(this.sessionId()).subscribe({
      next: () =>
        this.router.navigate([
          "/secure/scanning/session",
          this.sessionId(),
          "delivery-note",
        ]),
      error: (err) => {
        const msg = err?.error?.message || "Failed to close session";
        this.error.set(msg);
        this._snackBar.open(msg, "Close", {
          duration: 4000,
          verticalPosition: "top",
        });
      },
    });
  }

  exitSession() {
    // Navigate back, leaving the session as draft (can be resumed later)
    this._snackBar.open("Session saved as draft. You can resume it later.", "Close", {
      duration: 3000,
      verticalPosition: "top",
    });
    this.router.navigate(["/secure/scanning"]);
  }

  deleteSession() {
    if (!this.session()) {
      const msg = "Session not loaded or has expired";
      this.error.set(msg);
      this._snackBar.open(msg, "Close", {
        duration: 3000,
        verticalPosition: "top",
      });
      return;
    }

    // Confirm deletion
    const confirmed = confirm("Are you sure you want to delete this scanning session? This action cannot be undone.");
    if (!confirmed) return;

    // Delete the session
    this.api.deleteSession(this.sessionId()).subscribe({
      next: () => {
        this._snackBar.open("Session deleted successfully", "Close", {
          duration: 3000,
          verticalPosition: "top",
        });
        this.router.navigate(["/secure/scanning"]);
      },
      error: (err) => {
        const msg = err?.error?.message || "Failed to delete session";
        this.error.set(msg);
        this._snackBar.open(msg, "Close", {
          duration: 4000,
          verticalPosition: "top",
        });
      },
    });
  }

  // Basic heuristic for tracking code validity based on backend format:
  // `${routeCode}-${destinationCode}-${branchCode}-${parcelNumber}`
  private looksLikeTrackingCode(code: string): boolean {
    // Fast checks first
    if (code.length < 6) return false;
    const parts = code.split("-");
    if (parts.length !== 4) return false;
    const [routeCode, destinationCode, branchCode, parcelNumber] = parts;
    // Ensure non-empty alphanumeric segments and numeric parcel number
    const alphaNum = /^[A-Z0-9]+$/i;
    const digits = /^\d+$/;
    return (
      alphaNum.test(routeCode) &&
      alphaNum.test(destinationCode) &&
      alphaNum.test(branchCode) &&
      digits.test(parcelNumber)
    );
  }
}
