import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import { ScanningSessionService } from 'app/modules/secure/scanning/scanning-session.service';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-delivery-note',
  standalone: true,
  imports: [NgIf, NgFor, MatButtonModule],
  template: `
    <div class="p-6 space-y-4">
      <h1 class="text-xl font-semibold">Delivery Note (Preview)</h1>
      <ng-container *ngIf="session; else notFound">
        <div class="bg-white shadow rounded p-4 border border-gray-100">
          <div class="text-sm text-gray-500">Session ID</div>
          <div class="font-mono mb-4">{{ session.id }}</div>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div class="text-gray-500">Route</div>
              <div>{{ session.routeId }}</div>
            </div>
            <div>
              <div class="text-gray-500">Mode</div>
              <div class="capitalize">{{ session.mode }}</div>
            </div>
            <div>
              <div class="text-gray-500">Parcels</div>
              <div>{{ session.parcels.length }}</div>
            </div>
            <div *ngIf="session.mailBagCode">
              <div class="text-gray-500">Mail Bag Code</div>
              <div class="font-mono">{{ session.mailBagCode }}</div>
            </div>
          </div>
          <h2 class="mt-6 mb-2 font-medium">Parcels</h2>
          <ul class="text-xs grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <li *ngFor="let p of session.parcels" class="font-mono bg-blue-50 border border-blue-100 rounded px-2 py-1">{{ p }}</li>
          </ul>
        </div>
        <div class="flex gap-2">
          <button mat-stroked-button (click)="goBack()">Back</button>
          <button mat-flat-button color="primary" (click)="finish()">Finish</button>
        </div>
      </ng-container>
      <ng-template #notFound>
        <div class="text-red-600">Session not found.</div>
      </ng-template>
    </div>
  `,
})
export class DeliveryNoteComponent {
  session = this.service.getSession(this.route.snapshot.paramMap.get('id') || '');
  constructor(private route: ActivatedRoute, private router: Router, private service: ScanningSessionService) {}

  goBack() {
    if (this.session) {
      this.router.navigate(['../'], { relativeTo: this.route });
    }
  }

  finish() {
    // Placeholder for finalize logic / print
    this.router.navigate(['/secure']);
  }
}
