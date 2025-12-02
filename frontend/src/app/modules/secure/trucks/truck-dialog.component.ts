import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  styleUrls: ['./truck-dialog.component.scss'],
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
  editingId?: string;

  constructor(
    private fb: FormBuilder,
    private service: TrucksService,
    private dialogRef: MatDialogRef<TruckDialogComponent>,
    private snack: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any,
  ) {
    this.form = this.fb.group({
      registration: ['', Validators.required],
      make: [''],
      model: [''],
      capacity: [''],
    });

    if (this.data) {
      const t = this.data as any;
      this.editingId = t.id;
      this.form.patchValue({
        registration: t.registration || '',
        make: t.make || '',
        model: t.model || '',
        capacity: t.capacity ?? '',
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    this.loading = true;
    const payload = { ...this.form.value, capacity: this.form.value.capacity !== '' ? Number(this.form.value.capacity) : undefined };
    const req$ = this.editingId
      ? this.service.update(this.editingId, payload)
      : this.service.create(payload);
    req$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open(this.editingId ? 'Truck updated' : 'Truck created', 'Close', { duration: 2500, verticalPosition: 'top' });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to save truck', 'Close', { duration: 3500, verticalPosition: 'top' });
      },
    });
  }
}
