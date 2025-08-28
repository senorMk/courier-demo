import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ScanningSessionService } from 'app/modules/secure/scanning/scanning-session.service';
import { MailbagSummaryComponent } from './mailbag-summary.component';

@Component({
  selector: 'scanning-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MailbagSummaryComponent],
  templateUrl: './scanning-workspace.component.html'
})
export class ScanningWorkspaceComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scanningService: ScanningSessionService = inject(ScanningSessionService);

  sessionId = signal<string>('');
  session = computed(() => this.scanningService.getSession(this.sessionId()));
  barcodeInput = signal('');
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.sessionId.set(id);
    });
  }

  scan() {
    const code = this.barcodeInput().trim();
    if (!code) return;
    const res = this.scanningService.scanParcel(this.sessionId(), code);
    if (res.success) {
      this.barcodeInput.set('');
      this.error.set(null);
    } else {
      this.error.set(res.message);
    }
  }

  closeSession() {
    const result = this.scanningService.closeSession(this.sessionId());
    if (!result.success) {
      this.error.set(result.message);
      return;
    }
    // Redirect to a simple delivery note view placeholder
    this.router.navigate(['/secure/scanning/session', this.sessionId(), 'delivery-note']);
  }
}
