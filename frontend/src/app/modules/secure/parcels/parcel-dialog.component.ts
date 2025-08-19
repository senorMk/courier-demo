import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ParcelsService } from './parcels.service';

@Component({
  selector: 'app-parcel-dialog',
  templateUrl: './parcel-dialog.component.html'
})
export class ParcelDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelDialogComponent>
  ) {
    this.form = this._fb.group({
      customerId: ['', Validators.required],
      receiverId: ['', Validators.required],
      destinationId: ['', Validators.required]
    });
  }

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
      }
    });
  }
}
