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

  routes = signal<RouteItem[]>([]);
  routesLoading = signal<boolean>(false);

  form = this.fb.group({
    routeId: ["", Validators.required],
    mode: ["bag", Validators.required],
    tripId: [""]
  });

  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = ["route", "mode", "staff", "createdAt", "status", "actions"];
  recentSessions: any[] = [];
  totalSessions = 0;
  pageSize = 10;
  pageIndex = 0;
  apiBase = environment.serverURL;

  ngAfterViewInit() {
    this.fetchSessions();
    this.loadRoutes();
    if (this.paginator) {
      this.paginator.page.subscribe(() => {
        this.pageIndex = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this.fetchSessions();
      });
    }
  }

  private loadRoutes(limit: number = 200): void {
    this.routesLoading.set(true);
    this._routesSearch.listRoutes(limit).subscribe({
      next: (routes) => {
        this.routes.set(routes || []);
        const current = this.form.controls.routeId.value;
        if (current) {
          this.fetchOpenTrips(current);
        } else if (routes?.length === 1) {
          const onlyRoute = routes[0];
          this.form.controls.routeId.setValue(onlyRoute.id);
          this.fetchOpenTrips(onlyRoute.id);
        }
      },
      error: () => {
        this.routes.set([]);
        this.routesLoading.set(false);
      },
      complete: () => this.routesLoading.set(false),
    });
  }

  openTrips: Array<{ id: string; driverName: string; truckReg: string; status: string; createdAt: string }> = [];

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

    this.fetchOpenTrips(routeId);
  }

  private fetchOpenTrips(routeId: string) {
    if (!routeId) {
      this.openTrips = [];
      this.form.patchValue({ tripId: '' }, { emitEvent: false });
      return;
    }

    this._tripsApi.getOpenTrips(routeId).subscribe({
      next: (trips) => {
        this.openTrips = trips || [];
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
    this._scanningSessionsService.startSession({
      routeId: value.routeId!,
      mode: value.mode as any,
      // Pass tripId only if selected; backend enforces requirement for DISPATCH offices
      ...(value.tripId ? { tripId: value.tripId } : {}),
    }).subscribe({
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
