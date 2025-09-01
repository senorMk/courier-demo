import { Component } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { ParcelsService } from "./parcels.service";
import { Observable, BehaviorSubject, of } from "rxjs";
import { debounceTime, switchMap, catchError, tap } from "rxjs/operators";
import {
  OfficesSearchService,
  Office,
} from "../offices/offices-search.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatStepperModule } from "@angular/material/stepper";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-parcel-dialog",
  templateUrl: "./parcel-dialog.component.html",
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatPaginatorModule,
    MatTableModule,
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatStepperModule,
  ],
})
export class ParcelDialogComponent {
  form: FormGroup;
  loading = false;
  filteredOffices$: Observable<Office[]> = of([]);
  // Keep office autocomplete only
  private officeInput$ = new BehaviorSubject<string>("");
  private officesCache: Record<string, Office> = {};

  constructor(
    private _fb: FormBuilder,
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelDialogComponent>,
    private _officesSearch: OfficesSearchService,
    private _snackBar: MatSnackBar
  ) {
    this.form = this._fb.group({
      customer: this._fb.group({
        firstName: ["", Validators.required],
        lastName: ["", Validators.required],
        phoneNumber: ["", Validators.required],
        emailAddress: [""],
        idNumber: [""],
      }),
      receiver: this._fb.group({
        firstName: ["", Validators.required],
        lastName: ["", Validators.required],
        phoneNumber: ["", Validators.required],
        emailAddress: [""],
        idNumber: [""],
      }),
      officeId: ["", Validators.required],
    });
    this.filteredOffices$ = this.officeInput$.pipe(
      debounceTime(300),
      switchMap((q) =>
        q
          ? this._officesSearch.searchOffices(q).pipe(
              tap((offices) =>
                offices.forEach((o) => (this.officesCache[o.id] = o))
              ),
              catchError(() => of([]))
            )
          : of([])
      )
    );
  }

  onOfficeInput(value: string) {
    this.officeInput$.next(value);
  }

  onOfficeSelected(office: Office) {
    this.form.controls["officeId"].setValue(office.id);
    this.officesCache[office.id] = office;
  }

  officeDisplayFn = (office: Office | string | null): string => {
    if (!office) return "";
    if (typeof office === "string") {
      return this.officesCache[office]?.name
        ? this.officesCache[office].name
        : office;
    }
    return office.name;
  };

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const payload = this.form.value as any;
    this._service.createParcel(payload).subscribe({
      next: () => {
        this.loading = false;
        this._dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this._snackBar.open(
          "Failed to create parcel. Please try again.",
          "Close",
          { duration: 4000, verticalPosition: "top" }
        );
      },
    });
  }
}
