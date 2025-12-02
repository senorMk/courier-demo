import { Component, Inject, Optional } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { ReactiveFormsModule } from "@angular/forms";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { DriversService } from "./drivers.service";

@Component({
  selector: "app-driver-dialog",
  templateUrl: "./driver-dialog.component.html",
  standalone: true,
  styleUrls: ["./driver-dialog.component.scss"],
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatSnackBarModule,
  ],
})
export class DriverDialogComponent {
  form: FormGroup;
  loading = false;
  editingId?: string;

  constructor(
    private fb: FormBuilder,
    private service: DriversService,
    private dialogRef: MatDialogRef<DriverDialogComponent>,
    private snack: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.form = this.fb.group({
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      phoneNumber: [""],
      licenseNumber: [""],
    });

    if (this.data) {
      const d = this.data as any;
      this.editingId = d.id;
      this.form.patchValue({
        firstName: d.firstName || "",
        lastName: d.lastName || "",
        phoneNumber: d.phoneNumber || "",
        licenseNumber: d.licenseNumber || "",
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading = true;
    const req$ = this.editingId
      ? this.service.update(this.editingId, this.form.value)
      : this.service.create(this.form.value);
    req$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open(this.editingId ? "Driver updated" : "Driver created", "Close", {
          duration: 2500,
          verticalPosition: "top",
        });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.snack.open("Failed to save driver", "Close", {
          duration: 3500,
          verticalPosition: "top",
        });
      },
    });
  }
}
