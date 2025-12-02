import { Component, OnInit } from "@angular/core";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { Truck, TrucksService } from "./trucks.service";
import { TruckDialogComponent } from "./truck-dialog.component";

@Component({
  selector: "app-trucks",
  templateUrl: "./trucks.component.html",
  styleUrls: ["./trucks.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class TrucksComponent implements OnInit {
  displayedColumns = [
    "registration",
    "make",
    "model",
    "capacity",
    "createdAt",
    "actions",
  ];
  dataSource = new MatTableDataSource<Truck>([]);
  totalCount = 0;
  pageSize = 10;
  currentPageIndex = 0;

  constructor(
    private service: TrucksService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(pageIndex: number = this.currentPageIndex, pageSize: number = this.pageSize) {
    const apiPage = pageIndex + 1;
    this.service.list(pageIndex, pageSize).subscribe((res) => {
      this.dataSource.data = res.data || [];
      this.totalCount = Number(res.total || 0);
      this.pageSize = res.pageSize || pageSize;
      this.currentPageIndex = (res.page ?? apiPage) - 1;
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load(event.pageIndex, event.pageSize);
  }

  openCreate() {
    const ref = this.dialog.open(TruckDialogComponent, { width: "500px" });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.currentPageIndex = 0;
      this.load(0, this.pageSize);
    });
  }

  edit(row: Truck) {
    const ref = this.dialog.open(TruckDialogComponent, { width: "500px", data: row });
    ref.afterClosed().subscribe((ok) => ok && this.load(this.currentPageIndex, this.pageSize));
  }

  delete(row: Truck) {
    if (!row?.id) return;
    if (!confirm("Delete this truck?")) return;
    this.service.delete(row.id).subscribe(() => this.load(this.currentPageIndex, this.pageSize));
  }
}
