import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { DriversService } from './drivers.service';
import { driversRoutes } from './drivers.routing';
import { DriversComponent } from './drivers.component';
import { DriverDialogComponent } from './driver-dialog.component';

@NgModule({
  imports: [
    DriversComponent,
    DriverDialogComponent,
    RouterModule.forChild(driversRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [DriversService],
})
export class DriversModule {}

