import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { ParcelsService, Parcel } from "./parcels.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ParcelDialogComponent } from "./parcel-dialog.component";
import { MatIconModule } from "@angular/material/icon";
import { SelectionModel } from "@angular/cdk/collections";
import { MatCheckboxChange, MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { ParcelItemDialogComponent } from "./parcel-item-dialog.component";

@Component({
  selector: "app-parcels",
  templateUrl: "./parcels.component.html",
  styleUrls: ["./parcels.component.scss"],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
})
export class ParcelsComponent implements OnInit {
  displayedColumns: string[] = [
    "select",
    "parcelNumber",
    "customerId",
    "receiverId",
    "destinationId",
  ];
  dataSource = new MatTableDataSource<Parcel>([]);
  selection = new SelectionModel<Parcel>(false, []);
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
      this.dataSource.data = data.data || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(ParcelDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  onSelect(row: Parcel, event: MatCheckboxChange): void {
    if (event.checked) {
      this.selection.clear();
      this.selection.select(row);
    } else {
      this.selection.deselect(row);
    }
  }

  get selectedParcel(): Parcel | null {
    return this.selection.hasValue() ? this.selection.selected[0] : null;
  }

  openAddItemDialog(): void {
    const parcel = this.selectedParcel;
    if (!parcel || !parcel.id) {
      return;
    }
    const dialogRef = this._dialog.open(ParcelItemDialogComponent, {
      width: "400px",
      data: { parcelId: parcel.id },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Optionally reload or handle after item addition
      }
    });
  }
}
