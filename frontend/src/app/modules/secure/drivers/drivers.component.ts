import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Driver, DriversService } from './drivers.service';
import { DriverDialogComponent } from './driver-dialog.component';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatButtonModule],
})
export class DriversComponent implements OnInit {
  displayedColumns = ['firstName', 'lastName', 'phoneNumber', 'licenseNumber', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Driver>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private service: DriversService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.load();
  }

  load(pageIndex = 0, pageSize = 10) {
    this.service.list(pageIndex, pageSize).subscribe((res) => {
      this.dataSource.data = res.data || [];
      if (this.paginator) {
        this.paginator.length = res.total || this.dataSource.data.length;
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  openCreate() {
    const ref = this.dialog.open(DriverDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe((ok) => ok && this.load());
  }

  edit(row: Driver) {
    const ref = this.dialog.open(DriverDialogComponent, { width: '500px', data: row });
    ref.afterClosed().subscribe((ok) => ok && this.load(this.paginator?.pageIndex || 0, this.paginator?.pageSize || 10));
  }

  delete(row: Driver) {
    if (!row?.id) return;
    if (!confirm('Delete this driver?')) return;
    this.service.delete(row.id).subscribe(() => this.load());
  }
}
