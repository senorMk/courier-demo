import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DriversService } from './drivers.service';

@Component({
  selector: 'app-driver-dialog',
  templateUrl: './driver-dialog.component.html',
  standalone: true,
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

  constructor(
    private fb: FormBuilder,
    private service: DriversService,
    private dialogRef: MatDialogRef<DriverDialogComponent>,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: [''],
      licenseNumber: [''],
    });
  }

  save() {
    if (this.form.invalid) return;
    this.loading = true;
    this.service.create(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Driver created', 'Close', { duration: 2500, verticalPosition: 'top' });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to create driver', 'Close', { duration: 3500, verticalPosition: 'top' });
      },
    });
  }
}

