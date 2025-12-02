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
import { TrucksService } from './trucks.service';
import { trucksRoutes } from './trucks.routing';
import { TrucksComponent } from './trucks.component';
import { TruckDialogComponent } from './truck-dialog.component';

@NgModule({
  imports: [
    TrucksComponent,
    TruckDialogComponent,
    RouterModule.forChild(trucksRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [TrucksService],
})
export class TrucksModule {}

