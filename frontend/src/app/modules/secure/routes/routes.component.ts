import { Component, OnInit, ViewChild } from "@angular/core";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator } from "@angular/material/paginator";
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
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private _service: RoutesService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getRoutes(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.data || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
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
