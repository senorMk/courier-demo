import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TrucksService } from './trucks.service';

@Component({
  selector: 'app-truck-dialog',
  templateUrl: './truck-dialog.component.html',
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
export class TruckDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private service: TrucksService,
    private dialogRef: MatDialogRef<TruckDialogComponent>,
    private snack: MatSnackBar,
  ) {
    this.form = this.fb.group({
      registration: ['', Validators.required],
      make: [''],
      model: [''],
      capacity: [''],
    });
  }

  save() {
    if (this.form.invalid) return;
    this.loading = true;
    const payload = { ...this.form.value, capacity: this.form.value.capacity ? Number(this.form.value.capacity) : undefined };
    this.service.create(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('Truck created', 'Close', { duration: 2500, verticalPosition: 'top' });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to create truck', 'Close', { duration: 3500, verticalPosition: 'top' });
      },
    });
  }
}

