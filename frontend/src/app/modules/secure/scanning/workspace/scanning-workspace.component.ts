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
  }

  scan() {
    const code = this.barcodeInput().trim();
    if (!code) return;
    this.api.scanParcel(this.sessionId(), code).subscribe({
      next: () => {
        this.barcodeInput.set("");
        this.error.set(null);
        // refresh session
        this.api
          .getSession(this.sessionId())
          .subscribe((s) => this.session.set(s));
      },
      error: (err) => {
        this.error.set(err?.error?.message || "Failed to scan");
        this._snackBar.open(this.error()!, "Close", {
          duration: 3000,
          verticalPosition: "top",
        });
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

  cancel() {
    this.router.navigate(["/secure/scanning"]);
  }
}
