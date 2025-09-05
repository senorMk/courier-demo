import { Component } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
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
    CommonModule
  ],
})
export class DestinationDialogComponent {
  form: FormGroup;
  loading = false;
  filteredRoutes$: Observable<RouteItem[]> = of([]);
  private routeInput$ = new BehaviorSubject<string>("");
  private routesCache: Record<string, RouteItem> = {};

  constructor(
    private _fb: FormBuilder,
    private _service: DestinationsService,
    private _dialogRef: MatDialogRef<DestinationDialogComponent>,
    private _routesSearch: RoutesSearchService
  ) {
    this.form = this._fb.group({
      code: ["", Validators.required],
      name: ["", Validators.required],
      branchCode: ["", Validators.required],
      officeTypes: [[], Validators.required],
      routeId: ["", Validators.required],
    });

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
    this._service.createDestination(this.form.value).subscribe({
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
