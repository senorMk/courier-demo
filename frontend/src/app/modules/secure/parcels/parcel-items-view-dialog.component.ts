import { Component, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ParcelsService, Parcel } from "./parcels.service";
import { CommonModule } from "@angular/common";
import { MatTableModule } from "@angular/material/table";
import { MatButtonModule } from "@angular/material/button";
import { OnInit } from "@angular/core";

@Component({
  selector: "app-parcel-items-view-dialog",
  templateUrl: "./parcel-items-view-dialog.component.html",
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule],
})
export class ParcelItemsViewDialogComponent implements OnInit {
  items: any[] = [];
  displayedColumns = [
    "description",
    "quantity",
    "pricePerUnit",
    "value",
    "amount",
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { parcelId: string },
    private _service: ParcelsService,
    private _dialogRef: MatDialogRef<ParcelItemsViewDialogComponent>
  ) {}

  ngOnInit(): void {
    this._service.getParcelItems(this.data.parcelId).subscribe((items) => {
      this.items = items || [];
    });
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  closeDialog(): void {
    this._dialogRef.close();
  }
}
