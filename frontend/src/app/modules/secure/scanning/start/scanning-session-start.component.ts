import {
  Component,
  inject,
  signal,
  ViewChild,
  AfterViewInit,
} from "@angular/core";
import { ScanningSessionsService } from "../scanning-sessions-api.service";
import { environment } from "../../../../../environments/environment";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { ReactiveFormsModule, FormBuilder, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatRadioModule } from "@angular/material/radio";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatSelectModule } from "@angular/material/select";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { RoutesSearchService, RouteItem } from "../../routes/routes-search.service";
import { TripsApiService } from '../trips-api.service';
import { BayAuthorizationService } from 'app/services/bay-authorization.service';
import { UserSelectionService } from 'app/services/user-selection.service';

@Component({
  selector: "scanning-session-start",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
  ],
  templateUrl: "./scanning-session-start.component.html",
})
export class ScanningSessionStartComponent implements AfterViewInit {
  private _scanningSessionsService = inject(ScanningSessionsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private _routesSearch = inject(RoutesSearchService);
  private _snackBar = inject(MatSnackBar);
  private _tripsApi = inject(TripsApiService);
  private _bayAuth = inject(BayAuthorizationService);
  private _userSelection = inject(UserSelectionService);

  routes = signal<RouteItem[]>([]);
  routesLoading = signal<boolean>(false);
  // Check if user requires trip assignment - dispatchers and receivers need this
  get canAssignTrips(): boolean {
    return this._bayAuth.requiresTripAssignment();
  }

  // Check if user can access delivery notes - dispatchers and sorters
  get canAccessDeliveryNotes(): boolean {
    return this._bayAuth.canAccessDeliveryNotes();
  }

  // Check if user is a receiver (different trip selection logic)
  get isReceiver(): boolean {
    const user = this._userSelection.getCurrentUser();
    return user.roleKey === 'receiver';
  }

  // Check if user can select parcel categories (sorter or dispatcher)
  get canSelectCategory(): boolean {
    const user = this._userSelection.getCurrentUser();
    return user.roleKey === 'sorter' || user.roleKey === 'dispatcher';
  }

  form = this.fb.group({
    routeId: ["", Validators.required],
    mode: ["bag", Validators.required],
    tripId: [""], // Validators will be added dynamically based on bay type
    sessionCategory: [""] // Optional parcel category for sorters and dispatchers
  });

  constructor() {
    // Non-dispatch users don't select a bay, so drop the validator up front
    if (this.canAssignTrips) {
      this.form.controls.tripId.setValidators([Validators.required]);
      this.form.controls.tripId.updateValueAndValidity({ emitEvent: false });
    }
  }

  private _paginator: MatPaginator;

  @ViewChild(MatPaginator)
  set paginator(value: MatPaginator) {
    if (value) {
      this._paginator = value;
      this._paginator.page.subscribe(() => {
        this.pageIndex = this._paginator.pageIndex;
        this.pageSize = this._paginator.pageSize;
        this.fetchSessions();
      });
    }
  }

  get paginator(): MatPaginator {
    return this._paginator;
  }

  displayedColumns = ["route", "mode", "staff", "createdAt", "status", "actions"];
  recentSessions: any[] = [];
  totalSessions = 0;
  pageSize = 10;
  pageIndex = 0;
  apiBase = environment.serverURL;

  ngAfterViewInit() {
    this.fetchSessions();
    this.loadRoutes();
  }

  private loadRoutes(limit: number = 200): void {
    this.routesLoading.set(true);
    this._routesSearch.listRoutes(limit).subscribe({
      next: (routes) => {
        this.routes.set(routes || []);
        const current = this.form.controls.routeId.value;
        if (this.canAssignTrips) {
          if (current) {
            this.fetchOpenTrips(current);
          } else if (routes?.length === 1) {
            const onlyRoute = routes[0];
            this.form.controls.routeId.setValue(onlyRoute.id);
            this.fetchOpenTrips(onlyRoute.id);
          }
        }
      },
      error: () => {
        this.routes.set([]);
        this.routesLoading.set(false);
      },
      complete: () => this.routesLoading.set(false),
    });
  }

  openTrips: Array<{
    id: string;
    driverName: string;
    truckReg: string;
    status: string;
    createdAt: string;
    destinationOffice?: { name: string; branchCode: string; }
    destinationOfficeId?: string;
  }> = [];

  onRouteSelected(routeId: string | null) {
    if (!routeId) {
      this.form.controls.routeId.setValue('', { emitEvent: false });
      this.openTrips = [];
      this.form.patchValue({ tripId: '' }, { emitEvent: false });
      return;
    }

    // Ensure the reactive form control reflects the selection and validators run
    this.form.controls.routeId.setValue(routeId, { emitEvent: false });
    this.form.controls.routeId.updateValueAndValidity({ emitEvent: false });

    if (this.canAssignTrips) {
      this.fetchOpenTrips(routeId);
    }
  }

  private fetchOpenTrips(routeId: string) {
    if (!routeId) {
      this.openTrips = [];
      this.form.patchValue({ tripId: '' }, { emitEvent: false });
      return;
    }

    // Receivers fetch in-transit trips (IN_TRANSIT), dispatchers fetch open trips (PLANNED/LOADING)
    const apiCall = this.isReceiver
      ? this._tripsApi.getArrivedTrips(routeId)
      : this._tripsApi.getOpenTrips(routeId);

    apiCall.subscribe({
      next: (trips) => {
        this.openTrips = (trips || []).map((t: any) => ({
          id: t.id,
          driverName: t.driverName,
          truckReg: t.truckReg,
          status: t.status,
          createdAt: t.createdAt,
          completedAt: t.completedAt,
          destinationOffice: t.destinationOffice,
          destinationOfficeId: t.destinationOfficeId,
          office: t.office,
        }));
        this.form.patchValue({ tripId: '' }, { emitEvent: false });
      },
      error: () => {
        this.openTrips = [];
        this.form.patchValue({ tripId: '' }, { emitEvent: false });
      },
    });
  }

  fetchSessions() {
    this._scanningSessionsService
      .getPaginatedSessions(this.pageIndex + 1, this.pageSize)
      .subscribe({
        next: (data: any) => {
          this.recentSessions = (data.data || []).map((s: any) => ({
            id: s.id,
            routeName: s.route?.name || s.routeId,
            mode: s.mode,
            staff:
              ((s.user?.firstName || "") + " " + (s.user?.lastName || "")).trim(),
            createdAt: s.createdAt,
            status: s.closedAt ? "Completed" : "Draft",
            totalScans: s._count?.scans || 0,
          }));
          this.totalSessions = data.total || 0;
        },
        error: (err) => {
          console.error('Failed to fetch sessions', err);
          this.recentSessions = [];
          this.totalSessions = 0;
        },
      });
  }

  start() {
    if (this.form.invalid) return;
    const value = this.form.value;

    // Determine bay type based on user role
    const userInfo = this._userSelection.getCurrentUser();
    let bayType: string | undefined;

    if (userInfo.roleKey === 'sorter') {
      bayType = 'SORTING';  // Sorters work at sorting bay
    } else if (userInfo.roleKey === 'receiver') {
      bayType = 'RECEIVING';  // Receivers work at receiving bay
    } else if (userInfo.roleKey === 'dispatcher') {
      bayType = 'DISPATCH';  // Dispatchers work at dispatch bay
    }

    const payload: any = {
      routeId: value.routeId!,
      mode: value.mode as any,
      // Pass tripId only if selected; backend enforces requirement for DISPATCH bays
      ...(value.tripId ? { tripId: value.tripId } : {}),
      // Add bay type based on role
      ...(bayType ? { bayType } : {}),
      // Add session category if selected
      ...(value.sessionCategory ? { sessionCategory: value.sessionCategory } : {}),
    };

    this._scanningSessionsService.startSession(payload).subscribe({
      next: (session: any) => {
        this.router.navigate(["/secure/scanning/session", session.id]);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to start scanning session';
        this._snackBar.open(msg, 'Close', { duration: 4000, verticalPosition: 'top' });
      }
    });
  }

  startNewSession() {
    // Logic to start a new session, e.g. open a dialog or navigate
    // For now, just call start()
    this.start();
  }

  resumeSession(sessionId: string) {
    if (!sessionId) return;
    // Navigate to the scanning workspace for the existing session
    this.router.navigate(["/secure/scanning/session", sessionId]);
  }

  download(sessionId: string) {
    if (!sessionId) return;
    this._scanningSessionsService
      .downloadDeliveryNote(sessionId)
      .subscribe({
        next: (resp: any) => {
          const contentType = resp.headers.get('content-type') || 'application/pdf';
          const blob = new Blob([resp.body], { type: contentType });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        },
        error: (err) => {
          const msg = err?.error?.message || 'Unable to download delivery note';
          console.error('Download failed', err);
          alert(msg);
        }
      });
  }
}