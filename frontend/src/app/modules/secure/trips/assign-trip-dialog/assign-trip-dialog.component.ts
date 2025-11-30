import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DriversApiService, DriverItem } from '../drivers-api.service';
import { TrucksApiService, TruckItem } from '../trucks-api.service';

export interface AssignTripDialogData {
  tripId: string;
  currentDriverName: string;
  currentTruckReg: string;
  isActiveTrip: boolean;
}

@Component({
  selector: 'app-assign-trip-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './assign-trip-dialog.component.html',
})
export class AssignTripDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AssignTripDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as AssignTripDialogData;
  private fb = inject(FormBuilder);
  private driversApi = inject(DriversApiService);
  private trucksApi = inject(TrucksApiService);

  drivers = signal<DriverItem[]>([]);
  trucks = signal<TruckItem[]>([]);

  form = this.fb.group({
    driverName: [this.data.currentDriverName, Validators.required],
    truckReg: [this.data.currentTruckReg, Validators.required],
  });

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Load drivers
    this.driversApi.list(200).subscribe({
      next: (drivers) => this.drivers.set(drivers || []),
      error: () => this.drivers.set([]),
    });

    // Load trucks
    this.trucksApi.list(200).subscribe({
      next: (trucks) => this.trucks.set(trucks || []),
      error: () => this.trucks.set([]),
    });
  }

  formatDriverName(driver: DriverItem | { firstName?: string; lastName?: string } | null): string {
    if (!driver) return '';
    return `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
  }

  truckSubtitle(truck: TruckItem | null): string {
    if (!truck) return '';
    const parts: string[] = [];
    const make = truck.make ? String(truck.make).trim() : '';
    const model = truck.model ? String(truck.model).trim() : '';
    if (make) parts.push(make);
    if (model) parts.push(model);
    return parts.join(' ');
  }

  close(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }
}
