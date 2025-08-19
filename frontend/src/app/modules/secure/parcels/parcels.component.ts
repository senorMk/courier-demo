import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from '@angular/material/table';
import { ParcelsService, Parcel } from "./parcels.service";
import { MatFormFieldModule } from '@angular/material/form-field';
import { ParcelDialogComponent } from "./parcel-dialog.component";

@Component({
  selector: "app-parcels",
  templateUrl: "./parcels.component.html",
  styleUrls: ["./parcels.component.scss"],
  standalone: true,
  imports: [MatFormFieldModule, MatPaginatorModule, MatTableModule],
})
export class ParcelsComponent implements OnInit {
  displayedColumns: string[] = [
    "parcelNumber",
    "customerId",
    "receiverId",
    "destinationId",
  ];
  dataSource = new MatTableDataSource<Parcel>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _service: ParcelsService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getParcels(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.items || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(ParcelDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
