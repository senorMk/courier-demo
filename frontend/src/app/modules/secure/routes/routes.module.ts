import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routesRoutes } from './routes.routing';
import { RoutesComponent } from './routes.component';
import { RouteDialogComponent } from './route-dialog.component';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { RoutesService } from './routes.service';

@NgModule({
  imports: [
    RoutesComponent,
    RouteDialogComponent,
    RouterModule.forChild(routesRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  providers: [RoutesService]
})
export class RoutesModule {}
