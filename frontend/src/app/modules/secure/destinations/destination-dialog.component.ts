import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { DestinationsService } from './destinations.service';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-destination-dialog',
  templateUrl: './destination-dialog.component.html',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
  ],
})
export class DestinationDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: DestinationsService,
    private _dialogRef: MatDialogRef<DestinationDialogComponent>
  ) {
    this.form = this._fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      branchCode: ['', Validators.required],
      routeId: ['', Validators.required]
    });
  }

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
      }
    });
  }
}
