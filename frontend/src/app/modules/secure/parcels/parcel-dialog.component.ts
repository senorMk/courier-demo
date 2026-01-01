import { Component, DestroyRef, inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl,
} from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { ParcelsService } from "./parcels.service";
import { Observable, of } from "rxjs";
import {
  debounceTime,
  switchMap,
  catchError,
  map,
  startWith,
  distinctUntilChanged,
} from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  OfficesSearchService,
  Office,
} from "../offices/offices-search.service";
import { ParcelDescriptionsSearchService } from "./parcel-descriptions-search.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
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
    MatDialogModule,
    MatButtonModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatStepperModule,
    MatSelectModule,
    MatIconModule,
  ],
})
export class ParcelDialogComponent {
  form: FormGroup;
  loading = false;
  offices$: Observable<Office[]> = of([]);
  officeSearchControl = new FormControl<string | Office>("", {
    nonNullable: true,
  });
  selectedOffice: Office | null = null;
  descriptions$: Observable<string[]> = of([]);
  descriptionSearchControl = new FormControl<string>("", {
    nonNullable: true,
  });
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private _fb: FormBuilder,
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelDialogComponent>,
    private _officesSearch: OfficesSearchService,
    private _descriptionsSearch: ParcelDescriptionsSearchService,
    private _snackBar: MatSnackBar
  ) {
    this.form = this._fb.group({
      customer: this._fb.group({
        firstName: ["", Validators.required],
        phoneNumber: [
          "",
          [Validators.required, Validators.pattern(/^[0-9]{9}$/)],
        ],
      }),
      receiver: this._fb.group({
        firstName: ["", Validators.required],
        phoneNumber: [
          "",
          [Validators.required, Validators.pattern(/^[0-9]{9}$/)],
        ],
      }),
      description: ["", Validators.required],
      value: [null, [Validators.required, Validators.min(0)]],
      officeId: ["", Validators.required],
      size: ["MEDIUM", Validators.required],
      cargoType: ["NORMAL", Validators.required],
      payment: this._fb.group({
        method: ["CASH", Validators.required],
        amount: [null, [Validators.required, Validators.min(0)]],
        reference: [""],
      }),
    });
    this.setupUppercaseTransformers();
    this.offices$ = this.officeSearchControl.valueChanges.pipe(
      startWith(""),
      map((value) =>
        typeof value === "string"
          ? value
          : value?.name || value?.branchCode || value?.route?.name || ""
      ),
      map((value) => value.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) =>
        this._officesSearch
          .searchOffices(query)
          .pipe(
            map((offices) => this.filterReceivingOffices(offices)),
            catchError(() => of([]))
          )
      )
    );

    this.descriptions$ = this.descriptionSearchControl.valueChanges.pipe(
      startWith(""),
      map((value) => (typeof value === "string" ? value.trim() : "")),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) =>
        this._descriptionsSearch
          .searchDescriptions(query)
          .pipe(catchError(() => of([])))
      )
    );

    this.descriptionSearchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.form.controls["description"].setValue(value, { emitEvent: false });
      });

    this.officeSearchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (typeof value === "string") {
          this.form.controls["officeId"].setValue("", { emitEvent: false });
          this.selectedOffice = null;
          return;
        }
        if (value && value.id) {
          this.form.controls["officeId"].setValue(value.id);
          this.selectedOffice = value;
        }
      });
  }

  displayOffice = (office?: Office | string | null): string => {
    if (!office) {
      return "";
    }
    if (typeof office === "string") {
      return office;
    }
    const parts = [office.name, office.branchCode, office.route?.name].filter(
      Boolean
    );
    return parts.join(" • ");
  };

  displayDescription = (value?: string | null): string => {
    if (!value) return "";
    return typeof value === "string" ? value : "";
  };

  private filterReceivingOffices(offices: Office[]): Office[] {
    return (offices || []).filter((office) => {
      const types = Array.isArray(office.officeTypes)
        ? office.officeTypes
        : [];
      return types.includes("RECEIVING");
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const raw = this.form.value as any;
    const payload = {
      ...raw,
      description: (raw.description || "").trim(),
      value: raw.value !== null && raw.value !== undefined ? Number(raw.value) : raw.value,
      payment: raw.payment
        ? {
            ...raw.payment,
            amount:
              raw.payment.amount !== null && raw.payment.amount !== undefined
                ? Number(raw.payment.amount)
                : raw.payment.amount,
          }
        : raw.payment,
    };
    this._service.createParcel(payload).subscribe({
      next: (created) => {
        this.loading = false;
        const parcelId = (created as any)?.id;
        const ref = this._snackBar.open("Parcel created", "Download Receipts", {
          duration: 6000,
          verticalPosition: "top",
        });
        ref.onAction().subscribe(() => {
          if (!parcelId) return;
          this._service.downloadReceiptsZip(parcelId).subscribe({
            next: (blob) => {
              const a = document.createElement("a");
              const url = window.URL.createObjectURL(blob);
              a.href = url;
              a.download = `parcel-${parcelId}-receipts.zip`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            },
          });
        });
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

  // Keep cashier-entered text fields consistently uppercased
  private setupUppercaseTransformers(): void {
    const uppercasePaths = [
      "customer.firstName",
      "receiver.firstName",
      "description",
      "payment.reference",
    ];

    uppercasePaths.forEach((path) => this.uppercaseControl(path));
  }

  private uppercaseControl(path: string): void {
    const control = this.form.get(path);
    if (!control) {
      return;
    }

    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        if (typeof value !== "string") {
          return;
        }
        const uppercased = value.toUpperCase();
        if (value !== uppercased) {
          control.setValue(uppercased, { emitEvent: false });
        }
      });
  }
}