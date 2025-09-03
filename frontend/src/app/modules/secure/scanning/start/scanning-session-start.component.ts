import {
  Component,
  inject,
  signal,
  computed,
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
import { MatInputModule } from "@angular/material/input";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule, MatPaginator } from "@angular/material/paginator";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { RoutesSearchService, RouteItem } from "../../routes/routes-search.service";
import { debounceTime, switchMap, of, startWith } from 'rxjs';

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
    MatInputModule,
    MatAutocompleteModule,
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

  routes = signal<RouteItem[]>([]);
  filteredRoutes = signal<RouteItem[]>([]);

  form = this.fb.group({
    routeId: ["", Validators.required],
    routeSearch: [""],
    mode: ["individual", Validators.required],
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
    // Hook up route search
    this.form.controls.routeSearch?.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap((q: string) => q ? this._routesSearch.searchRoutes(q) : of([])),
    ).subscribe((routes: RouteItem[]) => {
      this.routes.set(routes || []);
      this.filteredRoutes.set(routes || []);
    });
    if (this.paginator) {
      this.paginator.page.subscribe(() => {
        this.pageIndex = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this.fetchSessions();
      });
    }
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

  selectRoute(r: any) {
    this.form.patchValue({ routeId: r.id, routeSearch: r.name });
  }

  start() {
    if (this.form.invalid) return;
    const value = this.form.value;
    this._scanningSessionsService.startSession({
      routeId: value.routeId!,
      mode: value.mode as any,
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
