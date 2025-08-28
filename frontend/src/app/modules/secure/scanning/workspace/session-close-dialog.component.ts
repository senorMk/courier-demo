import { Component, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-session-close-dialog',
  standalone: true,
  imports: [NgIf, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Close Session</h2>
    <div mat-dialog-content>
      <p *ngIf="data.mode === 'bag' && data.parcels < 10" class="text-amber-700 text-sm">Mail bag requires at least 10 parcels to close.</p>
      <p class="text-sm">Are you sure you want to close this scanning session?</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close(false)">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="data.mode==='bag' && data.parcels<10" (click)="ref.close(true)">Close</button>
    </div>
  `,
})
export class SessionCloseDialogComponent {
  constructor(
    public ref: MatDialogRef<SessionCloseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { mode: string; parcels: number }
  ) {}
}
