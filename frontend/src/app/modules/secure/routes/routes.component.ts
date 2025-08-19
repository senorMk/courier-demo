import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { RoutesService, RouteItem } from './routes.service';
import { RouteDialogComponent } from './route-dialog.component';

@Component({
  selector: 'app-routes',
  templateUrl: './routes.component.html',
  styleUrls: ['./routes.component.scss']
})
export class RoutesComponent implements OnInit {
  displayedColumns: string[] = ['code', 'name'];
  dataSource = new MatTableDataSource<RouteItem>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private _service: RoutesService, private _dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getRoutes(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.items || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(RouteDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
