import { Component, Inject, Optional, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService, Role } from './users.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

interface Office {
  id: string;
  name: string;
  branchCode: string;
}

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  standalone: true,
  styleUrls: ['./user-dialog.component.scss'],
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
})
export class UserDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  editingId?: string;
  roles: Role[] = [];
  offices: Office[] = [];
  bayTypes = [
    { value: 'SENDING', label: 'Sending Bay' },
    { value: 'RECEIVING', label: 'Receiving Bay' },
    { value: 'SORTING', label: 'Sorting Bay' },
    { value: 'DISPATCH', label: 'Dispatch Bay' },
  ];

  constructor(
    private fb: FormBuilder,
    private service: UsersService,
    private http: HttpClient,
    private dialogRef: MatDialogRef<UserDialogComponent>,
    private snack: MatSnackBar,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', this.data ? [] : [Validators.required, Validators.minLength(8)]],
      firstName: [''],
      lastName: [''],
      roleId: ['', Validators.required],
      officeId: [''],
    });

    if (this.data) {
      this.editingId = this.data.id;
      this.form.patchValue({
        email: this.data.email || '',
        firstName: this.data.firstName || '',
        lastName: this.data.lastName || '',
        roleId: this.data.roleId || '',
        officeId: this.data.officeId || '',
      });
    }
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadOffices();
  }

  loadRoles() {
    this.service.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      },
      error: (err) => {
        console.error('Failed to load roles', err);
      },
    });
  }

  loadOffices() {
    this.http.get<Office[]>(`${environment.serverURL}/v1/routes/offices/search`).subscribe({
      next: (offices) => {
        this.offices = offices;
      },
      error: (err) => {
        console.error('Failed to load offices', err);
      },
    });
  }

  isCashierRole(): boolean {
    const roleId = this.form.get('roleId')?.value;
    if (!roleId) return false;
    const selectedRole = this.roles.find(r => r.id === roleId);
    return selectedRole?.name.toLowerCase() === 'cashier';
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = { ...this.form.value };

    // Remove password if editing and password field is empty
    if (this.editingId && !payload.password) {
      delete payload.password;
    }

    // Remove officeId if empty
    if (!payload.officeId) {
      payload.officeId = null;
    }

    const req$ = this.editingId
      ? this.service.updateUser(this.editingId, payload)
      : this.service.createUser(payload);

    req$.subscribe({
      next: () => {
        this.loading = false;
        this.snack.open(this.editingId ? 'User updated' : 'User created', 'Close', {
          duration: 2500,
          verticalPosition: 'top',
        });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        const message = err.error?.message || 'Failed to save user';
        this.snack.open(message, 'Close', {
          duration: 3500,
          verticalPosition: 'top',
        });
      },
    });
  }
}
