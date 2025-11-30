import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { ParcelQueryType } from './parcel-queries.service';

interface ParcelContact {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailAddress?: string;
}

interface ParcelQueryDialogData {
  parcelId: string;
  trackingCode?: string;
  parcelNumber?: number;
  sender?: ParcelContact | null;
  receiver?: ParcelContact | null;
  office?: { name: string; branchCode: string } | null;
}

@Component({
  selector: 'app-parcel-query-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './parcel-query-dialog.component.html',
})
export class ParcelQueryDialogComponent {
  readonly form = this.fb.nonNullable.group({
    queryType: ['', Validators.required],
    description: [''],
  });

  readonly queryTypes: { value: ParcelQueryType; label: string }[] = [
    { value: 'GENERAL', label: 'General Inquiry' },
    { value: 'DAMAGE', label: 'Damage Report' },
    { value: 'ROUTING_ISSUE', label: 'Routing Issue' },
    { value: 'DELAY', label: 'Delay' },
    { value: 'MISSING', label: 'Missing Parcel' },
    { value: 'DELIVERY_STATUS', label: 'Delivery Status' },
    { value: 'PAYMENT', label: 'Payment Issue' },
    { value: 'OTHER', label: 'Other' },
  ];

  readonly sender = this.normalizeContact(this.data.sender);
  readonly receiver = this.normalizeContact(this.data.receiver);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ParcelQueryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParcelQueryDialogData
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

    const queryType = this.form.controls.queryType.value as ParcelQueryType;
    const description = this.form.controls.description.value.trim();

    if (!queryType) {
      this.form.controls.queryType.setErrors({ required: true });
      return;
    }

    this.dialogRef.close({
      parcelId: this.data.parcelId,
      queryType,
      description: description || undefined,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
