import { Component, inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: "app-cancel-parcel-dialog",
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Cancel Parcel</h2>
    <form class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="flex flex-col gap-3">
        <p class="text-sm text-gray-600">
          Provide a reason for cancelling this parcel. This note is stored with the cancellation log.
        </p>
        <mat-form-field appearance="fill">
          <mat-label>Reason</mat-label>
          <textarea
            matInput
            rows="3"
            formControlName="reason"
            placeholder="e.g. Duplicate parcel or customer request"
          ></textarea>
          <mat-error *ngIf="form.controls.reason.hasError('required')">
            A reason is required
          </mat-error>
          <mat-error *ngIf="form.controls.reason.hasError('minlength')">
            Please enter at least 5 characters
          </mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="close()">Keep Parcel</button>
        <button mat-flat-button color="warn" type="submit" [disabled]="form.invalid">
          Cancel Parcel
        </button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CancelParcelDialogComponent {
  private dialogRef = inject(MatDialogRef<CancelParcelDialogComponent>);
  private fb = inject(FormBuilder);
  readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as {
    parcelLabel?: string;
  };

  form = this.fb.group({
    reason: ["", [Validators.required, Validators.minLength(5)]],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    const reason = this.form.value.reason?.trim();
    this.dialogRef.close({ reason });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}