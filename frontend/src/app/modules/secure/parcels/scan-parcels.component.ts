import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-scan-parcels',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './scan-parcels.component.html',
})
export class ScanParcelsComponent {
  onStartScanning() {
    // Placeholder for scan logic
    alert('Scanning started!');
  }
}
