import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Truck, TrucksService } from './trucks.service';
import { TruckDialogComponent } from './truck-dialog.component';

@Component({
  selector: 'app-trucks',
  templateUrl: './trucks.component.html',
  styleUrls: ['./trucks.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatButtonModule],
})
export class TrucksComponent implements OnInit {
  displayedColumns = ['registration', 'make', 'model', 'capacity', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Truck>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private service: TrucksService, private dialog: MatDialog) {}

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
    const ref = this.dialog.open(TruckDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((ok) => ok && this.load());
  }

  delete(row: Truck) {
    if (!row?.id) return;
    if (!confirm('Delete this truck?')) return;
    this.service.delete(row.id).subscribe(() => this.load());
  }
}
