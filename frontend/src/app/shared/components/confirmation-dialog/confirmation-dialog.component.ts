import { Component, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmationDialogData {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, NgIf],
  templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
  private readonly injectedData = inject(MAT_DIALOG_DATA, { optional: true }) as ConfirmationDialogData | null;

  readonly data: Required<ConfirmationDialogData> = {
    title: 'Confirm Action',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    ...this.injectedData,
  };

  close(confirmed: boolean): void {
    this.dialogRef.close(confirmed);
  }
}
