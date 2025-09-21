import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

interface ParcelContact {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailAddress?: string;
}

interface ParcelComplaintDialogData {
  code: string;
  sender?: ParcelContact | null;
  receiver?: ParcelContact | null;
}

@Component({
  selector: 'app-parcel-complaint-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './parcel-complaint-dialog.component.html',
})
export class ParcelComplaintDialogComponent {
  readonly form = this.fb.nonNullable.group({
    complaint: ['', Validators.required],
  });

  readonly sender = this.normalizeContact(this.data.sender);
  readonly receiver = this.normalizeContact(this.data.receiver);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ParcelComplaintDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParcelComplaintDialogData
  ) {}

  private normalizeContact(contact?: ParcelContact | null): { name: string; phone?: string; email?: string } {
    if (!contact) {
      return { name: 'Unknown' };
    }

    const name = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim() || 'Unknown';
    const phone = contact.phoneNumber?.trim();
    const email = contact.emailAddress?.trim();

    return { name, phone, email };
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const complaint = this.form.controls.complaint.value.trim();
    if (!complaint) {
      this.form.controls.complaint.setErrors({ required: true });
      return;
    }

    this.dialogRef.close(complaint);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
