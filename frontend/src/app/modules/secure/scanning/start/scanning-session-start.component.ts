import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  AfterViewInit,
} from "@angular/core";
import { ScanningSessionsService } from "../scanning-sessions-api.service";
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
import { ScanningSessionService } from "app/modules/secure/scanning/scanning-session.service";

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
  ],
  templateUrl: "./scanning-session-start.component.html",
})
export class ScanningSessionStartComponent implements AfterViewInit {
  private _scanningSessionsService = inject(ScanningSessionsService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private scanningService = inject(ScanningSessionService);

  routes = signal<any[]>(this.scanningService.getRoutes());
  filteredRoutes = computed(() => {
    const q = (this.form.controls.routeSearch?.value || "").toLowerCase();
    if (!q) return this.routes();
    return this.routes().filter(
      (r) => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  });

  form = this.fb.group({
    staffId: ["", Validators.required],
    routeId: ["", Validators.required],
    routeSearch: [""],
    mode: ["individual", Validators.required],
  });

  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = ["route", "mode", "createdAt", "status"];
  recentSessions: any[] = [];
  totalSessions = 0;
  pageSize = 10;
  pageIndex = 0;

  ngAfterViewInit() {
    this.fetchSessions();
    if (this.paginator) {
      this.paginator.page.subscribe(() => {
        this.pageIndex = this.paginator.pageIndex;
        this.pageSize = this.paginator.pageSize;
        this.fetchSessions();
      });
    }
  }

  async fetchSessions() {
    try {
      const data = await this._scanningSessionsService.getPaginatedSessions(
        this.pageIndex + 1,
        this.pageSize
      );
      this.recentSessions = (data.data || []).map((s: any) => ({
        routeName: s.routeId, // Replace with actual route name if available
        mode: s.mode,
        createdAt: s.createdAt,
        status: s.closedAt ? "Completed" : "Draft",
      }));
      this.totalSessions = data.total || 0;
    } catch (err) {
      // Optionally handle error
      this.recentSessions = [];
      this.totalSessions = 0;
    }
  }

  selectRoute(r: any) {
    this.form.patchValue({ routeId: r.id, routeSearch: r.name });
  }

  start() {
    if (this.form.invalid) return;
    const value = this.form.value;
    const session = this.scanningService.startSession({
      routeId: value.routeId!,
      mode: value.mode!,
      staffId: value.staffId!,
    });
    this.router.navigate(["/secure/scanning/session", session.id]);
  }

  startNewSession() {
    // Logic to start a new session, e.g. open a dialog or navigate
    // For now, just call start()
    this.start();
  }
}
