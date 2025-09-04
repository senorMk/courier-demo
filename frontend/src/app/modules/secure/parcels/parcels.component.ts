import { Component, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, PageEvent } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { ParcelsService, Parcel } from "./parcels.service";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ParcelDialogComponent } from "./parcel-dialog.component";
import { MatIconModule } from "@angular/material/icon";
import { SelectionModel } from "@angular/cdk/collections";
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { CommonModule } from "@angular/common";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { ParcelItemDialogComponent } from "./parcel-item-dialog.component";
import { ParcelItemsViewDialogComponent } from "./parcel-items-view-dialog.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";

@Component({
  selector: "app-parcels",
  templateUrl: "./parcels.component.html",
  styleUrls: ["./parcels.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatMenuModule,
  ],
})
export class ParcelsComponent implements OnInit {
  displayedColumns: string[] = [
    "select",
    "trackingCode",
    "parcelNumber",
    "customerId",
    "receiverId",
    "destinationId",
    "createdAt",
    "actions",
  ];
  dataSource = new MatTableDataSource<Parcel>([]);
  selection = new SelectionModel<Parcel>(false, []);
  selectedParcel: Parcel | null = null;
  total = 0;
  pageSize = 10;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _service: ParcelsService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = this.pageSize): void {
    this._service.getParcels(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      this.total = Number(data.total || 0);
      this.pageSize = pageSize;
    });
  }

  onPage(event: PageEvent): void {
    this.loadData(event.pageIndex, event.pageSize);
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(ParcelDialogComponent, {
      width: "700px",
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
      this.selectedParcel = row;
    } else {
      this.selection.deselect(row);
      this.selectedParcel = null;
    }
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

  openViewItemsDialog(): void {
    const parcel = this.selectedParcel;
    if (!parcel || !parcel.id) {
      return;
    }
    // You can replace ParcelItemDialogComponent with a dedicated view dialog if needed
    this._dialog.open(ParcelItemsViewDialogComponent, {
      width: "600px",
      data: { parcelId: parcel.id, viewOnly: true },
    });
  }

  downloadReceipts(row: Parcel): void {
    const id = (row as any)?.id;
    if (!id) return;
    this._service.downloadReceiptsZip(id).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `parcel-${id}-receipts.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this._snackBar.open('Failed to download receipts', 'Close', { duration: 3000, verticalPosition: 'top' });
      }
    });
  }

  downloadReceipt(row: Parcel, type: 'sender' | 'sticker' | 'accounts'): void {
    const id = (row as any)?.id;
    if (!id) return;
    this._service.downloadReceipt(id, type).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this._snackBar.open('Failed to download receipt', 'Close', { duration: 3000, verticalPosition: 'top' });
      }
    });
  }
}
