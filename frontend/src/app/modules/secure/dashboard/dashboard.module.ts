import { NgModule } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatDividerModule } from "@angular/material/divider";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSortModule } from "@angular/material/sort";
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { NgApexchartsModule } from "ng-apexcharts";
import { SharedModule } from "../../../shared/shared.module";
import { CommonModule } from "@angular/common";
import { DashboardComponent } from "./dashboard.component";
import { dashboardRoutes } from "./dashboard.routing";
import { RouterModule } from "@angular/router";
import { DashboardService } from "./dashboard.service";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { MatRippleModule } from "@angular/material/core";
import { ParcelsService } from "../parcels/parcels.service";

@NgModule({
  imports: [
    DashboardComponent,
    RouterModule.forChild(dashboardRoutes),
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    NgApexchartsModule,
    SharedModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatRippleModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  providers: [DashboardService, MatSnackBar, ParcelsService],
})
export class DashboardModule {}
