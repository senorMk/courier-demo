import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { DestinationsService, Destination } from "./destinations.service";
import { DestinationDialogComponent } from "./destination-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-destinations",
  templateUrl: "./destinations.component.html",
  styleUrls: ["./destinations.component.scss"],
  standalone: true,
  imports: [MatTableModule, MatPaginatorModule, MatIconModule, CommonModule],
})
export class DestinationsComponent implements OnInit {
  displayedColumns: string[] = [
    "name",
    "branchCode",
    "officeTypes",
    "routeName",
    "createdAt",
    "actions",
  ];
  dataSource = new MatTableDataSource<Destination>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _service: DestinationsService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getDestinations(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(DestinationDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  openEditDialog(row: Destination): void {
    const dialogRef = this._dialog.open(DestinationDialogComponent, {
      width: "400px",
      data: { office: row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData(this.paginator?.pageIndex || 0, this.paginator?.pageSize || 10);
      }
    });
  }

  delete(row: Destination): void {
    if (!row?.id) return;
    if (!confirm(`Delete office "${row.name}"? This cannot be undone.`)) return;
    this._service.deleteDestination(row.id).subscribe(() => {
      this.loadData(this.paginator?.pageIndex || 0, this.paginator?.pageSize || 10);
    });
  }
}
