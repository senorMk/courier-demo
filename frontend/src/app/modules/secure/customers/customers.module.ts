import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { customersRoutes } from "./customers.routing";
import { CustomersComponent } from "./customers.component";
import { CustomerDialogComponent } from "./customer-dialog.component";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { ReactiveFormsModule } from "@angular/forms";
import { CustomersService } from "./customers.service";

@NgModule({
  imports: [
    CustomersComponent,
    CustomerDialogComponent,
    RouterModule.forChild(customersRoutes),
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  providers: [CustomersService],
})
export class CustomersModule {}
