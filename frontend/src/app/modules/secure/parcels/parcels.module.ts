import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { parcelsRoutes } from "./parcels.routing";
import { ParcelsComponent } from "./parcels.component";
import { ParcelDialogComponent } from "./parcel-dialog.component";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import { ParcelsService } from "./parcels.service";

@NgModule({
  imports: [
    ParcelsComponent,
    ParcelDialogComponent,
    RouterModule.forChild(parcelsRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [ParcelsService],
})
export class ParcelsModule {}
