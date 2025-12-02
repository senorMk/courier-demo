import { Component, Input } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
// Accept either the in-memory ScanningSession shape or backend session with scans[]

@Component({
  selector: 'app-mailbag-summary',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <div *ngIf="session && session.mode === 'bag'" class="p-4 rounded border border-blue-200 bg-blue-50">
      <div class="font-semibold text-blue-700 mb-2">Mail Bag Summary</div>
      <div class="text-sm mb-2">Bag Code: <span class="font-mono">{{ session.mailBagCode || '—' }}</span></div>
      <div class="text-sm mb-2">Parcels: {{ (session.parcels?.length || session.scans?.length || 0) }}</div>
      <ul class="text-xs max-h-40 overflow-auto space-y-1">
        <li *ngFor="let p of (session.parcels || session.scans || [])" class="font-mono bg-white border border-blue-100 rounded px-2 py-0.5">{{ p?.parcelId || p }}</li>
      </ul>
      <div *ngIf="(session.parcels?.length || session.scans?.length || 0) < 10" class="mt-2 text-xs text-amber-600">Need {{ 10 - (session.parcels?.length || session.scans?.length || 0) }} more to close bag.</div>
    </div>
  `,
})
export class MailbagSummaryComponent {
  @Input() session!: any;
}
