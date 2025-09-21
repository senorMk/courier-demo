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
    driverName: ['', Validators.required],
    truckReg: ['', Validators.required],
  });

  displayedColumns = ['route', 'office', 'driver', 'truck', 'status', 'actions'];
  trips: any[] = [];

  routes = signal<RouteItem[]>([]);
  routesLoading = signal<boolean>(false);
  office = signal<OfficeItem | null>(null);
  drivers = signal<DriverItem[]>([]);
  trucks = signal<TruckItem[]>([]);

  constructor() {
    this.initializeSelections();
    this.refresh();
  }

  private initializeSelections() {
    const token = localStorage.getItem('accessToken') || '';
    const payload: any = token ? decodeJwt(token) : null;
    const officeId = payload?.officeId;

    if (officeId) {
      this.form.patchValue({ officeId });
      this.officesSearch.getById(officeId).subscribe({
        next: (office) => {
          this.office.set(office);
          const routeId = office?.routeId || office?.route?.id;
          if (routeId && !this.form.controls['routeId'].value) {
            this.form.patchValue({ routeId });
          }
          this.ensureRouteInOptions(routeId, office?.route);
        },
        error: () => {
          this.office.set(null);
        },
      });
    }

    this.routesLoading.set(true);
    this.routesSearch.listRoutes(200).subscribe({
      next: (routes) => {
        this.routes.set(routes || []);
        const officeRouteId = this.office()?.routeId || this.office()?.route?.id;
        if (officeRouteId) {
          this.ensureRouteInOptions(officeRouteId, this.office()?.route);
          const routeControl = this.form.controls['routeId'];
          if (!routeControl.value && routes.some((r) => r.id === officeRouteId)) {
            routeControl.patchValue(officeRouteId);
          }
        }
      },
      error: () => {
        this.routes.set([]);
        this.routesLoading.set(false);
      },
      complete: () => this.routesLoading.set(false),
    });

    this.driversApi.list(200).subscribe({
      next: (drivers) => this.drivers.set(drivers || []),
      error: () => this.drivers.set([]),
    });

    this.trucksApi.list(200).subscribe({
      next: (trucks) => this.trucks.set(trucks || []),
      error: () => this.trucks.set([]),
    });
  }

  private ensureRouteInOptions(routeId?: string, route?: { id: string; name: string; code?: string }) {
    if (!routeId) return;
    const current = this.routes();
    if (current.some((r) => r.id === routeId)) return;
    if (route) {
      this.routes.set([
        { id: route.id, name: route.name, code: route.code ?? '' },
        ...current,
      ]);
    } else {
      this.routes.set([
        { id: routeId, name: 'Selected Route', code: '' },
        ...current,
      ]);
    }
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
    this.tripsApi.create({ routeId, officeId, driverName, truckReg }).subscribe({
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
