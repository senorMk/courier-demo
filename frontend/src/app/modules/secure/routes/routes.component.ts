import { Component, OnInit } from "@angular/core";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { MatTableModule } from "@angular/material/table";
import { MatDialog } from "@angular/material/dialog";
import { RoutesService, RouteItem } from "./routes.service";
import { RouteDialogComponent } from "./route-dialog.component";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-routes",
  templateUrl: "./routes.component.html",
  styleUrls: ["./routes.component.scss"],
  standalone: true,
  imports: [MatPaginatorModule, MatTableModule, MatIconModule, CommonModule],
})
export class RoutesComponent implements OnInit {
  displayedColumns: string[] = ["code", "name", "createdAt"];
  dataSource = new MatTableDataSource<RouteItem>([]);
  totalCount = 0;
  pageSize = 10;
  currentPageIndex = 0;

  constructor(
    private _service: RoutesService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = this.currentPageIndex, pageSize: number = this.pageSize): void {
    const apiPage = pageIndex + 1;
    this._service.getRoutes(apiPage, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      this.totalCount = Number(data.total || 0);
      this.pageSize = data.pageSize || pageSize;
      this.currentPageIndex = (data.page ?? apiPage) - 1;
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData(event.pageIndex, event.pageSize);
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(RouteDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
