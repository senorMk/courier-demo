import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { CustomersService } from './customers.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-customer-dialog',
  templateUrl: './customer-dialog.component.html',
  standalone: true,
  imports: [
    MatFormFieldModule,
    // ...other modules if needed...
  ReactiveFormsModule,
  ],
})
export class CustomerDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: CustomersService,
    private _dialogRef: MatDialogRef<CustomerDialogComponent>
  ) {
    this.form = this._fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      emailAddress: [''],
      idNumber: ['']
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this._service.createCustomer(this.form.value).subscribe({
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
