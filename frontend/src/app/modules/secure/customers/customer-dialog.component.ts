import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { CustomersService } from "./customers.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

@Component({
  selector: "app-customer-dialog",
  templateUrl: "./customer-dialog.component.html",
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
})
export class CustomerDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: CustomersService,
    private _dialogRef: MatDialogRef<CustomerDialogComponent>,
    private _snackBar: MatSnackBar
  ) {
    this.form = this._fb.group({
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      phoneNumber: ["", Validators.required],
      emailAddress: [""],
      idNumber: [""],
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this._service.createCustomer(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this._snackBar.open("Customer created successfully!", "Close", {
          duration: 3000,
          verticalPosition: "top",
        });
        this._dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this._snackBar.open(
          "Failed to create customer. Please try again.",
          "Close",
          {
            duration: 4000,
            verticalPosition: "top",
          }
        );
      },
    });
  }
}
