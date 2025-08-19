import { Component } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { ParcelsService } from "./parcels.service";
import {
  CustomersSearchService,
  Customer,
} from "../customers/customers-search.service";
import { Observable, BehaviorSubject, of } from "rxjs";
import { debounceTime, switchMap, catchError, tap } from "rxjs/operators";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
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
    MatAutocompleteModule,
  ],
})
export class ParcelDialogComponent {
  form: FormGroup;
  loading = false;
  filteredCustomers$: Observable<Customer[]> = of([]);
  filteredReceivers$: Observable<Customer[]> = of([]);
  private customerInput$ = new BehaviorSubject<string>("");
  private receiverInput$ = new BehaviorSubject<string>("");
  private customersCache: Record<string, Customer> = {};
  private receiversCache: Record<string, Customer> = {};

  constructor(
    private _fb: FormBuilder,
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelDialogComponent>,
    private _customersSearch: CustomersSearchService
  ) {
    this.form = this._fb.group({
      customerId: ["", Validators.required],
      receiverId: ["", Validators.required],
      destinationId: ["", Validators.required],
    });

    this.filteredCustomers$ = this.customerInput$.pipe(
      debounceTime(300),
      switchMap((q) =>
        q
          ? this._customersSearch.searchCustomers(q).pipe(
              tap((customers) =>
                customers.forEach((c) => (this.customersCache[c.id] = c))
              ),
              catchError(() => of([]))
            )
          : of([])
      )
    );
    this.filteredReceivers$ = this.receiverInput$.pipe(
      debounceTime(300),
      switchMap((q) =>
        q
          ? this._customersSearch.searchCustomers(q).pipe(
              tap((customers) =>
                customers.forEach((c) => (this.receiversCache[c.id] = c))
              ),
              catchError(() => of([]))
            )
          : of([])
      )
    );
  }

  onCustomerInput(value: string) {
    this.customerInput$.next(value);
  }

  onReceiverInput(value: string) {
    this.receiverInput$.next(value);
  }

  onCustomerSelected(customer: Customer) {
    this.form.controls["customerId"].setValue(customer.id);
    this.customersCache[customer.id] = customer;
  }

  onReceiverSelected(customer: Customer) {
    this.form.controls["receiverId"].setValue(customer.id);
    this.receiversCache[customer.id] = customer;
  }

  customerDisplayFn = (customer: Customer | string | null): string => {
    if (!customer) return "";
    if (typeof customer === "string") {
      return this.customersCache[customer]?.firstName &&
        this.customersCache[customer]?.lastName
        ? `${this.customersCache[customer].firstName} ${this.customersCache[customer].lastName}`
        : customer;
    }
    return `${customer.firstName} ${customer.lastName}`;
  };

  receiverDisplayFn = (customer: Customer | string | null): string => {
    if (!customer) return "";
    if (typeof customer === "string") {
      return this.receiversCache[customer]?.firstName &&
        this.receiversCache[customer]?.lastName
        ? `${this.receiversCache[customer].firstName} ${this.receiversCache[customer].lastName}`
        : customer;
    }
    return `${customer.firstName} ${customer.lastName}`;
  };

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this._service.createParcel(this.form.value).subscribe({
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
