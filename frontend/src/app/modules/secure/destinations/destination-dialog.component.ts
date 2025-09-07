import { Component, Inject, Optional } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { DestinationsService } from "./destinations.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import {
  RoutesSearchService,
  RouteItem,
} from "../routes/routes-search.service";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { Observable, BehaviorSubject, of } from "rxjs";
import { debounceTime, switchMap, catchError, tap } from "rxjs/operators";
import { CommonModule } from "@angular/common";
import { MatSelectModule } from "@angular/material/select";

@Component({
  selector: "app-destination-dialog",
  templateUrl: "./destination-dialog.component.html",
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatSelectModule,
    CommonModule,
  ],
})
export class DestinationDialogComponent {
  form: FormGroup;
  loading = false;
  filteredRoutes$: Observable<RouteItem[]> = of([]);
  private routeInput$ = new BehaviorSubject<string>("");
  private routesCache: Record<string, RouteItem> = {};
  editingId?: string;

  constructor(
    private _fb: FormBuilder,
    private _service: DestinationsService,
    private _dialogRef: MatDialogRef<DestinationDialogComponent>,
    private _routesSearch: RoutesSearchService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.form = this._fb.group({
      code: ["", Validators.required],
      name: ["", Validators.required],
      branchCode: ["", Validators.required],
      officeTypes: [[], Validators.required],
      routeId: ["", Validators.required],
    });

    // If dialog opened in edit mode, patch values
    if (this.data && this.data.office) {
      const o = this.data.office as any;
      this.editingId = o.id;
      const branchCode = o.branchCode ?? o.branch_code ?? o.code ?? "";
      this.form.patchValue({
        code: o.branchCode || "",
        name: o.name || "",
        branchCode,
        officeTypes: o.officeTypes || [],
        routeId: o.routeId || o.route?.id || "",
      });
      // Seed route cache so the autocomplete input shows the route name instead of the id
      const rId = o.routeId || o.route?.id;
      const rName = o.route?.name;
      const rCode = o.route?.code;
      if (rId && rName) {
        this.routesCache[rId] = {
          id: rId,
          name: rName,
          code: rCode || "",
        } as RouteItem;
      }
      // If essential fields are missing, fetch full record
      if (!branchCode && this.editingId) {
        this._service.getDestination(this.editingId).subscribe((full) => {
          this.form.patchValue({
            branchCode: (full as any).branchCode ?? (full as any).code ?? "",
            name: full.name,
            officeTypes: (full as any).officeTypes || [],
            routeId: (full as any).routeId || (full as any).route?.id || "",
          });
          const route = (full as any).route;
          if (route?.id && route?.name) {
            this.routesCache[route.id] = {
              id: route.id,
              name: route.name,
              code: route.code || "",
            } as RouteItem;
          }
        });
      }
    }

    this.filteredRoutes$ = this.routeInput$.pipe(
      debounceTime(300),
      switchMap((q) =>
        q
          ? this._routesSearch.searchRoutes(q).pipe(
              tap((routes) =>
                routes.forEach((r) => (this.routesCache[r.id] = r))
              ),
              catchError(() => of([]))
            )
          : of([])
      )
    );
  }

  onRouteInput(value: string) {
    this.routeInput$.next(value);
  }

  onRouteSelected(route: RouteItem) {
    this.form.controls["routeId"].setValue(route.id);
    this.routesCache[route.id] = route;
  }

  routeDisplayFn = (route: RouteItem | string | null): string => {
    if (!route) return "";
    if (typeof route === "string") {
      return this.routesCache[route]?.name
        ? this.routesCache[route].name
        : route;
    }
    return route.name;
  };

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const payload = this.form.value;
    const req$ = this.editingId
      ? this._service.updateDestination(this.editingId, payload)
      : this._service.createDestination(payload);
    req$.subscribe({
      next: () => {
        this.loading = false;
        this._dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
