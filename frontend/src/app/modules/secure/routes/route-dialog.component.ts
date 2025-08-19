import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from '@angular/material/table';
import { MatDialogRef } from "@angular/material/dialog";
import { RoutesService } from "./routes.service";
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: "app-route-dialog",
  templateUrl: "./route-dialog.component.html",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTableModule,
  ],
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
      code: ["", Validators.required],
      name: ["", Validators.required],
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
      },
    });
  }
}
