import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { DestinationsService, Destination } from './destinations.service';
import { DestinationDialogComponent } from './destination-dialog.component';

@Component({
  selector: 'app-destinations',
  templateUrl: './destinations.component.html',
  styleUrls: ['./destinations.component.scss']
})
export class DestinationsComponent implements OnInit {
  displayedColumns: string[] = ['code', 'name', 'branchCode', 'routeId'];
  dataSource = new MatTableDataSource<Destination>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private _service: DestinationsService, private _dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = 0, pageSize: number = 10): void {
    this._service.getDestinations(pageIndex, pageSize).subscribe((data) => {
      this.dataSource.data = data.items || [];
      if (this.paginator) {
        this.paginator.length = data.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(DestinationDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
