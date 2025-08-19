import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { RoutesService } from './routes.service';

@Component({
  selector: 'app-route-dialog',
  templateUrl: './route-dialog.component.html'
})
export class RouteDialogComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private _fb: FormBuilder,
    private _service: RoutesService,
    private _dialogRef: MatDialogRef<RouteDialogComponent>
  ) {
    this.form = this._fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this._service.createRoute(this.form.value).subscribe({
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
