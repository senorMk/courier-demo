import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { decodeJwt } from 'app/core/utils/jwt.util';
import { RoutesSearchService, RouteItem } from '../routes/routes-search.service';
import { OfficesSearchService, OfficeItem } from './offices-search.service';
import { TripsApiService } from './trips-api.service';
import { DriversApiService, DriverItem } from './drivers-api.service';
import { TrucksApiService, TruckItem } from './trucks-api.service';
import { ConfirmationDialogComponent } from 'app/shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './trips.component.html',
})
export class TripsComponent {
  private fb = inject(FormBuilder);
  private routesSearch = inject(RoutesSearchService);
  private officesSearch = inject(OfficesSearchService);
  private tripsApi = inject(TripsApiService);
  private driversApi = inject(DriversApiService);
  private trucksApi = inject(TrucksApiService);
  private dialog = inject(MatDialog);

  form = this.fb.group({
    routeId: ['', Validators.required],
    officeId: ['', Validators.required],
    destinationOfficeId: ['', Validators.required],
    driverName: ['', Validators.required],
    truckReg: ['', Validators.required],
  });

  displayedColumns = ['route', 'office', 'destination', 'driver', 'truck', 'status', 'actions'];
  trips: any[] = [];

  routes = signal<RouteItem[]>([]);
  routesLoading = signal<boolean>(false);
  offices = signal<OfficeItem[]>([]);
  officesLoading = signal<boolean>(false);
  drivers = signal<DriverItem[]>([]);
  trucks = signal<TruckItem[]>([]);

  constructor() {
    this.initializeSelections();
    this.refresh();
    this.setupRouteChangeListener();
    this.setupOfficeChangeListener();
  }

  private setupRouteChangeListener() {
    this.form.controls.routeId.valueChanges.subscribe((routeId) => {
      if (routeId) {
        this.loadOfficesForRoute(routeId);
      } else {
        this.offices.set([]);
        this.form.patchValue({ officeId: '', destinationOfficeId: '' });
      }
    });
  }

  private loadOfficesForRoute(routeId: string) {
    this.officesLoading.set(true);
    this.officesSearch.search('').subscribe({
      next: (allOffices) => {
        const filteredOffices = allOffices.filter(o =>
          o.routeId === routeId || o.route?.id === routeId
        );
        this.offices.set(filteredOffices);

        // Auto-select if only one office or if user's office is in the list
        const token = localStorage.getItem('accessToken') || '';
        const payload: any = token ? decodeJwt(token) : null;
        const userOfficeId = payload?.officeId;

        if (filteredOffices.length === 1) {
          this.form.patchValue({ officeId: filteredOffices[0].id });
          if (this.form.controls['destinationOfficeId'].value === filteredOffices[0].id) {
            this.form.patchValue({ destinationOfficeId: '' });
          }
        } else if (userOfficeId && filteredOffices.some(o => o.id === userOfficeId)) {
          this.form.patchValue({ officeId: userOfficeId });
        }

        // Ensure destination selection remains valid for new route
        const currentDestination = this.form.controls['destinationOfficeId'].value;
        if (currentDestination && !filteredOffices.some(o => o.id === currentDestination)) {
          this.form.patchValue({ destinationOfficeId: '' });
        }

        this.officesLoading.set(false);
      },
      error: () => {
        this.offices.set([]);
        this.officesLoading.set(false);
      },
    });
  }

  private setupOfficeChangeListener() {
    this.form.controls.officeId.valueChanges.subscribe((originId) => {
      const destinationControl = this.form.controls.destinationOfficeId;
      if (originId && destinationControl.value === originId) {
        destinationControl.patchValue('');
      }
    });
  }

  private initializeSelections() {
    const token = localStorage.getItem('accessToken') || '';
    const payload: any = token ? decodeJwt(token) : null;
    const userOfficeId = payload?.officeId;

    // Load routes
    this.routesLoading.set(true);
    this.routesSearch.listRoutes(200).subscribe({
      next: (routes) => {
        this.routes.set(routes || []);

        // If user has an office, try to pre-select their route
        if (userOfficeId) {
          this.officesSearch.getById(userOfficeId).subscribe({
            next: (office) => {
              const routeId = office?.routeId || office?.route?.id;
              if (routeId && routes.some((r) => r.id === routeId)) {
                this.form.patchValue({ routeId });
                // loadOfficesForRoute will be triggered by valueChanges
              }
            },
            error: () => {
              // Ignore error, user can select route manually
            },
          });
        }
      },
      error: () => {
        this.routes.set([]);
        this.routesLoading.set(false);
      },
      complete: () => this.routesLoading.set(false),
    });

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

  refresh() {
    this.tripsApi.list(1, 10).subscribe({
      next: (res: any) => (this.trips = res.data || []),
      error: () => (this.trips = []),
    });
  }

  createTrip() {
    if (this.form.invalid) return;
    const { routeId, officeId, driverName, truckReg } = this.form.value as any;
    const destinationOfficeId = this.form.value.destinationOfficeId as string;
    this.tripsApi.create({ routeId, officeId, destinationOfficeId, driverName, truckReg }).subscribe({
      next: () => {
        this.refresh();
      },
      error: (err) => alert(err?.error?.message || 'Failed to create trip'),
    });
  }

  promptAssign(t: any) {
    const driverName = prompt('Driver name', t.driverName || '');
    if (driverName === null) return;
    const truckReg = prompt('Truck registration', t.truckReg || '');
    if (truckReg === null) return;
    this.tripsApi
      .assign(t.id, { driverName, truckReg })
      .subscribe({ next: () => this.refresh(), error: (e) => alert(e?.error?.message || 'Failed to assign') });
  }

  start(t: any) {
    if (!confirm('Mark trip In Transit and send SMS?')) return;
    this.tripsApi
      .start(t.id)
      .subscribe({ next: () => this.refresh(), error: (e) => alert(e?.error?.message || 'Failed to start trip') });
  }

  complete(t: any) {
    const dialogReference = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Complete Trip',
        message: 'Complete trip and send arrival SMS?',
        confirmLabel: 'Complete',
        cancelLabel: 'Cancel',
      },
    });

    dialogReference.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.tripsApi
        .complete(t.id)
        .subscribe({
          next: () => this.refresh(),
          error: (e) => alert(e?.error?.message || 'Failed to complete trip'),
        });
    });
  }
}
