import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { decodeJwt } from 'app/core/utils/jwt.util';
import { OfficesSearchService, OfficeItem } from './offices-search.service';
import { TripsApiService } from './trips-api.service';
import { DriversApiService, DriverItem } from './drivers-api.service';
import { SidersApiService, SiderItem } from './siders-api.service';
import { TrucksApiService, TruckItem } from './trucks-api.service';
import { ConfirmationDialogComponent } from 'app/shared/components/confirmation-dialog/confirmation-dialog.component';
import { RoutesSearchService, RouteItem } from '../routes/routes-search.service';
import { AssignTripDialogComponent } from './assign-trip-dialog/assign-trip-dialog.component';

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
  private officesSearch = inject(OfficesSearchService);
  private routesSearch = inject(RoutesSearchService);
  private tripsApi = inject(TripsApiService);
  private driversApi = inject(DriversApiService);
  private sidersApi = inject(SidersApiService);
  private trucksApi = inject(TrucksApiService);
  private dialog = inject(MatDialog);

  form = this.fb.group({
    destinationOfficeId: ['', Validators.required],
    destinationRouteId: [''],
    mainDriverId: ['', Validators.required],
    secondaryDriverId: [''],
    siderId: [''],
    truckReg: ['', Validators.required],
  });

  displayedColumns = ['route', 'office', 'destination', 'driver', 'truck', 'status', 'createdAt', 'actions'];
  trips: any[] = [];

  offices = signal<OfficeItem[]>([]);
  officesLoading = signal<boolean>(false);
  routes = signal<RouteItem[]>([]);
  routesLoading = signal<boolean>(false);
  drivers = signal<DriverItem[]>([]);
  siders = signal<SiderItem[]>([]);
  trucks = signal<TruckItem[]>([]);

  constructor() {
    this.initializeSelections();
    this.refresh();
  }

  private loadAllOffices() {
    this.officesLoading.set(true);
    this.officesSearch.search('').subscribe({
      next: (allOffices) => {
        // Show all offices except user's own office
        const token = localStorage.getItem('accessToken') || '';
        const payload: any = token ? decodeJwt(token) : null;
        const userOfficeId = payload?.officeId;

        // Filter out user's office from destination options
        const availableOffices = userOfficeId
          ? allOffices.filter(o => o.id !== userOfficeId)
          : allOffices;

        this.offices.set(availableOffices);
        this.officesLoading.set(false);
      },
      error: () => {
        this.offices.set([]);
        this.officesLoading.set(false);
      },
    });
  }

  private initializeSelections() {
    // Load all offices immediately
    this.loadAllOffices();

    // Load all routes
    this.routesLoading.set(true);
    this.routesSearch.listRoutes(200).subscribe({
      next: (routes) => {
        this.routes.set(routes || []);
        this.routesLoading.set(false);
      },
      error: () => {
        this.routes.set([]);
        this.routesLoading.set(false);
      },
    });

    // Load drivers
    this.driversApi.list(200).subscribe({
      next: (drivers) => this.drivers.set(drivers || []),
      error: () => this.drivers.set([]),
    });

    // Load siders
    this.sidersApi.list(200).subscribe({
      next: (siders) => this.siders.set(siders || []),
      error: () => this.siders.set([]),
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
    const { mainDriverId, secondaryDriverId, siderId, truckReg, destinationOfficeId, destinationRouteId } = this.form.value as any;

    // Get user's office ID from token
    const token = localStorage.getItem('accessToken') || '';
    const payload: any = token ? decodeJwt(token) : null;
    const officeId = payload?.officeId;

    if (!officeId) {
      alert('Unable to determine your office. Please log in again.');
      return;
    }

    // Get routeId from the user's office
    this.officesSearch.getById(officeId).subscribe({
      next: (userOffice) => {
        const routeId = userOffice?.routeId || userOffice?.route?.id;

        if (!routeId) {
          alert('Unable to determine route for your office');
          return;
        }

        // Get main driver name for legacy field
        const mainDriver = this.drivers().find(d => d.id === mainDriverId);
        const driverName = mainDriver ? `${mainDriver.firstName} ${mainDriver.lastName}` : '';

        const tripData: any = {
          routeId,
          officeId,
          destinationOfficeId,
          driverName,
          mainDriverId,
          truckReg
        };

        // Only add optional fields if they're selected
        if (destinationRouteId) {
          tripData.destinationRouteId = destinationRouteId;
        }
        if (secondaryDriverId) {
          tripData.secondaryDriverId = secondaryDriverId;
        }
        if (siderId) {
          tripData.siderId = siderId;
        }

        this.tripsApi.create(tripData).subscribe({
          next: () => {
            this.form.reset();
            this.refresh();
          },
          error: (err) => alert(err?.error?.message || 'Failed to create trip'),
        });
      },
      error: () => {
        alert('Unable to fetch your office information');
      },
    });
  }

  promptAssign(t: any) {
    const isActiveTrip = t.status === 'IN_TRANSIT';
    const dialogRef = this.dialog.open(AssignTripDialogComponent, {
      data: {
        tripId: t.id,
        currentDriverName: t.driverName || '',
        currentMainDriverId: t.mainDriverId || '',
        currentSecondaryDriverId: t.secondaryDriverId || '',
        currentSiderId: t.siderId || '',
        currentTruckReg: t.truckReg || '',
        isActiveTrip: isActiveTrip,
      },
      width: '500px',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      const { driverName, mainDriverId, secondaryDriverId, siderId, truckReg } = result;

      const assignData: any = {
        driverName,
        mainDriverId,
        truckReg
      };

      // Only include optional fields if they have values
      if (secondaryDriverId) {
        assignData.secondaryDriverId = secondaryDriverId;
      }
      if (siderId) {
        assignData.siderId = siderId;
      }

      this.tripsApi
        .assign(t.id, assignData)
        .subscribe({
          next: () => {
            this.refresh();
            if (isActiveTrip) {
              alert('Active trip updated successfully. Changes have been logged.');
            }
          },
          error: (e) => alert(e?.error?.message || 'Failed to assign'),
        });
    });
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
