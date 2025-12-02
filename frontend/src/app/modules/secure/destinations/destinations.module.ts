import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { destinationsRoutes } from "./destinations.routing";
import { DestinationsComponent } from "./destinations.component";
import { DestinationDialogComponent } from "./destination-dialog.component";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import { DestinationsService } from "./destinations.service";

@NgModule({
  imports: [
    DestinationsComponent,
    DestinationDialogComponent,
    RouterModule.forChild(destinationsRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [DestinationsService],
})
export class DestinationsModule {}
