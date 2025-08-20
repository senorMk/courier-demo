import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { CustomersService, Customer } from "./customers.service";
import { CustomerDialogComponent } from "./customer-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-customers",
  templateUrl: "./customers.component.html",
  styleUrls: ["./customers.component.scss"],
  standalone: true,
  imports: [MatPaginatorModule, MatTableModule, MatIconModule, CommonModule],
})
export class CustomersComponent implements OnInit {
  displayedColumns: string[] = [
    "firstName",
    "lastName",
    "phoneNumber",
    "emailAddress",
    "idNumber",
    "createdAt"
  ];
  dataSource = new MatTableDataSource<Customer>([]);

  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _service: CustomersService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getCustomers(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(CustomerDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
