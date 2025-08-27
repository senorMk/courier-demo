import { Component, Inject } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from "@angular/forms";
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";
import { ParcelsService, ParcelItem } from "./parcels.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-parcel-item-dialog",
  templateUrl: "./parcel-item-dialog.component.html",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatButtonModule,
  ],
})
export class ParcelItemDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { parcelId: string }
  ) {
    this.form = this._fb.group({
      quantity: [1, Validators.required],
      description: ["", Validators.required],
      pricePerUnit: [0, Validators.required],
      value: [0, Validators.required],
      amount: [{ value: 0, disabled: true }, Validators.required],
    });

    this.form.valueChanges.subscribe((val) => {
      const qty = Number(val.quantity) || 0;
      const price = Number(val.pricePerUnit) || 0;
      const value = Number(val.value) || 0;
      this.form.patchValue({ amount: qty * price * value }, { emitEvent: false });
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const payload: ParcelItem = {
      ...this.form.getRawValue(),
    } as ParcelItem;
    this.loading = true;
    this._service.createParcelItem(this.data.parcelId, payload).subscribe({
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
