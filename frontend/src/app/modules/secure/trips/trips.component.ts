import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { debounceTime, of, startWith, switchMap } from 'rxjs';
import { RoutesSearchService, RouteItem } from '../routes/routes-search.service';
import { OfficesSearchService, OfficeItem } from './offices-search.service';
import { TripsApiService } from './trips-api.service';
import { DriversApiService } from './drivers-api.service';
import { TrucksApiService } from './trucks-api.service';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatRadioModule,
  ],
  template: `
    <div class="flex flex-col gap-4" style="width: 100%; padding: 20px;">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">Trips</h1>
        <div class="space-x-2">
          <button mat-stroked-button (click)="refresh()">Refresh</button>
          <button mat-raised-button color="primary" (click)="createTrip()" [disabled]="form.invalid" class="custom-primary-btn">Create Trip</button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md p-4 grid gap-4 md:grid-cols-3">
        <mat-form-field appearance="fill">
          <mat-label>Search Route</mat-label>
          <input matInput [formControl]="form.controls['routeSearch']" placeholder="Type route name/code" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Search Office</mat-label>
          <input matInput [formControl]="form.controls['officeSearch']" placeholder="Type office name/branch code" />
        </mat-form-field>

        <mat-form-field appearance="fill">
          <mat-label>Search Driver</mat-label>
          <input matInput [formControl]="form.controls['driverSearch']" placeholder="Type driver name/phone/license" />
        </mat-form-field>
        <div class="flex items-end gap-2">
          <mat-form-field appearance="fill" class="flex-1">
            <mat-label>Driver Name</mat-label>
            <input matInput [formControl]="form.controls['driverName']" placeholder="e.g. John Banda" />
          </mat-form-field>
          <button mat-stroked-button (click)="addDriver()">Add Driver</button>
        </div>
        <mat-form-field appearance="fill">
          <mat-label>Search Truck</mat-label>
          <input matInput [formControl]="form.controls['truckSearch']" placeholder="Type registration/make/model" />
        </mat-form-field>
        <div class="flex items-end gap-2">
          <mat-form-field appearance="fill" class="flex-1">
            <mat-label>Truck Registration</mat-label>
            <input matInput [formControl]="form.controls['truckReg']" placeholder="e.g. ABC 1234" />
          </mat-form-field>
          <button mat-stroked-button (click)="addTruck()">Add Truck</button>
        </div>

        <div class="md:col-span-3 grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-500">Route Results</div>
            <mat-radio-group [formControl]="form.controls['routeId']" class="mt-2 flex flex-col gap-1">
              <mat-radio-button *ngFor="let r of routeResults()" [value]="r.id" class="py-1">
                <span class="text-sm font-medium">{{ r.name }}</span>
                <span class="text-[11px] text-gray-500 ml-2">{{ r.code }}</span>
              </mat-radio-button>
            </mat-radio-group>
          </div>
          <div>
            <div class="text-xs text-gray-500">Office Results</div>
            <mat-radio-group [formControl]="form.controls['officeId']" class="mt-2 flex flex-col gap-1">
              <mat-radio-button *ngFor="let o of officeResults()" [value]="o.id" class="py-1">
                <span class="text-sm font-medium">{{ o.name }}</span>
                <span class="text-[11px] text-gray-500 ml-2">{{ o.branchCode }}</span>
              </mat-radio-button>
            </mat-radio-group>
          </div>
        </div>

        <div class="md:col-span-3 grid grid-cols-2 gap-4">
          <div>
            <div class="text-xs text-gray-500">Driver Results</div>
            <mat-radio-group (change)="onPickDriver($event)" class="mt-2 flex flex-col gap-1">
              <mat-radio-button *ngFor="let d of driverResults" [value]="d" class="py-1">
                <span class="text-sm font-medium">{{ d.firstName }} {{ d.lastName }}</span>
                <span class="text-[11px] text-gray-500 ml-2">{{ d.phoneNumber || d.licenseNumber }}</span>
              </mat-radio-button>
            </mat-radio-group>
          </div>
          <div>
            <div class="text-xs text-gray-500">Truck Results</div>
            <mat-radio-group (change)="onPickTruck($event)" class="mt-2 flex flex-col gap-1">
              <mat-radio-button *ngFor="let t of truckResults" [value]="t" class="py-1">
                <span class="text-sm font-medium">{{ t.registration }}</span>
                <span class="text-[11px] text-gray-500 ml-2">{{ t.make }} {{ t.model }}</span>
              </mat-radio-button>
            </mat-radio-group>
          </div>
        </div>

      </div>

      <div class="flex flex-col flex-1 min-h-0 bg-white rounded-lg shadow-md overflow-hidden">
        <table mat-table [dataSource]="trips" style="width: 100%">
          <ng-container matColumnDef="route">
            <th mat-header-cell *matHeaderCellDef>Route</th>
            <td mat-cell *matCellDef="let t">{{ t.route?.name || t.routeId }}</td>
          </ng-container>
          <ng-container matColumnDef="office">
            <th mat-header-cell *matHeaderCellDef>Office</th>
            <td mat-cell *matCellDef="let t">{{ t.office?.name }} ({{ t.office?.branchCode }})</td>
          </ng-container>
          <ng-container matColumnDef="driver">
            <th mat-header-cell *matHeaderCellDef>Driver</th>
            <td mat-cell *matCellDef="let t">{{ t.driverName }}</td>
          </ng-container>
          <ng-container matColumnDef="truck">
            <th mat-header-cell *matHeaderCellDef>Truck</th>
            <td mat-cell *matCellDef="let t">{{ t.truckReg }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let t">{{ t.status }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef class="text-right">Actions</th>
            <td mat-cell *matCellDef="let t" class="text-right space-x-1">
              <button mat-stroked-button color="primary" (click)="promptAssign(t)" [disabled]="t.status==='IN_TRANSIT'||t.status==='COMPLETED'">Assign</button>
              <button mat-stroked-button color="accent" (click)="start(t)" [disabled]="t.status!=='PLANNED' && t.status!=='LOADING'">Start</button>
              <button mat-stroked-button color="warn" (click)="complete(t)" [disabled]="t.status!=='IN_TRANSIT'">Complete</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </div>
  `,
})
export class TripsComponent {
  private fb = inject(FormBuilder);
  private routesSearch = inject(RoutesSearchService);
  private officesSearch = inject(OfficesSearchService);
  private tripsApi = inject(TripsApiService);
  private driversApi = inject(DriversApiService);
  private trucksApi = inject(TrucksApiService);

  form = this.fb.group({
    routeSearch: [''],
    officeSearch: [''],
    routeId: ['', Validators.required],
    officeId: ['', Validators.required],
    driverSearch: [''],
    driverName: ['', Validators.required],
    truckSearch: [''],
    truckReg: ['', Validators.required],
  });

  displayedColumns = ['route', 'office', 'driver', 'truck', 'status', 'actions'];
  trips: any[] = [];
  routeResults = signal<RouteItem[]>([]);
  officeResults = signal<OfficeItem[]>([]);
  driverResults: any[] = [];
  truckResults: any[] = [];

  constructor() {
    this.form.controls.routeSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap((q: any) => q ? this.routesSearch.searchRoutes(q) : of([])),
    ).subscribe((rows: any) => this.routeResults.set(rows || []));

    this.form.controls.officeSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap((q: any) => q ? this.officesSearch.search(q) : of([])),
    ).subscribe((rows: any) => {
      const routeId = this.form.controls.routeId.value as string;
      const filtered = Array.isArray(rows) && routeId
        ? rows.filter((o: any) => o?.routeId === routeId)
        : (rows || []);
      this.officeResults.set(filtered);
    });

    // When route changes, clear selected office and refilter current office results
    this.form.controls.routeId.valueChanges.subscribe((rid: string) => {
      this.form.patchValue({ officeId: '' }, { emitEvent: false });
      const currentOffices = this.officeResults();
      if (Array.isArray(currentOffices) && rid) {
        this.officeResults.set(currentOffices.filter((o: any) => o?.routeId === rid));
      }
    });

    this.refresh();

    // Search drivers
    this.form.controls.driverSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap((q: any) => q ? this.driversApi.search(q) : of([])),
    ).subscribe((rows: any) => this.driverResults = rows || []);

    // Search trucks
    this.form.controls.truckSearch.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap((q: any) => q ? this.trucksApi.search(q) : of([])),
    ).subscribe((rows: any) => this.truckResults = rows || []);
  }

  refresh() {
    this.tripsApi.list(1, 10).subscribe({ next: (res: any) => this.trips = res.data || [], error: () => this.trips = [] });
  }

  createTrip() {
    if (this.form.invalid) return;
    const { routeId, officeId, driverName, truckReg } = this.form.value as any;
    this.tripsApi.create({ routeId, officeId, driverName, truckReg }).subscribe({
      next: () => { this.refresh(); },
      error: (err) => alert(err?.error?.message || 'Failed to create trip'),
    });
  }

  promptAssign(t: any) {
    const driverName = prompt('Driver name', t.driverName || '');
    if (driverName === null) return;
    const truckReg = prompt('Truck registration', t.truckReg || '');
    if (truckReg === null) return;
    this.tripsApi.assign(t.id, { driverName, truckReg }).subscribe({ next: () => this.refresh(), error: (e) => alert(e?.error?.message || 'Failed to assign') });
  }

  start(t: any) {
    if (!confirm('Mark trip In Transit and send SMS?')) return;
    this.tripsApi.start(t.id).subscribe({ next: () => this.refresh(), error: (e) => alert(e?.error?.message || 'Failed to start trip') });
  }

  complete(t: any) {
    if (!confirm('Complete trip and send arrival SMS?')) return;
    this.tripsApi.complete(t.id).subscribe({ next: () => this.refresh(), error: (e) => alert(e?.error?.message || 'Failed to complete trip') });
  }

  onPickDriver(e: any) {
    const d = e?.value;
    if (d) {
      const name = `${d.firstName} ${d.lastName}`.trim();
      this.form.patchValue({ driverName: name });
    }
  }

  onPickTruck(e: any) {
    const t = e?.value;
    if (t?.registration) {
      this.form.patchValue({ truckReg: t.registration });
    }
  }

  addDriver() {
    const firstName = prompt('Driver first name');
    if (!firstName) return;
    const lastName = prompt('Driver last name');
    if (!lastName) return;
    const phoneNumber = prompt('Phone (optional, digits only)') || undefined;
    const licenseNumber = prompt('License (optional)') || undefined;
    this.driversApi.create({ firstName, lastName, phoneNumber, licenseNumber }).subscribe({
      next: (d: any) => {
        const name = `${d.firstName} ${d.lastName}`.trim();
        this.form.patchValue({ driverName: name });
        this.driverResults = [d, ...this.driverResults];
      },
      error: (e) => alert(e?.error?.message || 'Failed to create driver')
    });
  }

  addTruck() {
    const registration = prompt('Truck registration');
    if (!registration) return;
    const make = prompt('Make (optional)') || undefined;
    const model = prompt('Model (optional)') || undefined;
    const capStr = prompt('Capacity (optional, number)') || undefined;
    const capacity = capStr ? Number(capStr) : undefined;
    this.trucksApi.create({ registration, make, model, capacity }).subscribe({
      next: (t: any) => {
        this.form.patchValue({ truckReg: t.registration });
        this.truckResults = [t, ...this.truckResults];
      },
      error: (e) => alert(e?.error?.message || 'Failed to create truck')
    });
  }
}
