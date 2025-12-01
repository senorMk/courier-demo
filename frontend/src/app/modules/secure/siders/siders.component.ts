import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Sider, SidersService } from './siders.service';
import { SiderDialogComponent } from './sider-dialog.component';

@Component({
  selector: 'app-siders',
  templateUrl: './siders.component.html',
  styleUrls: ['./siders.component.scss'],
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatIconModule, MatButtonModule],
})
export class SidersComponent implements OnInit {
  displayedColumns = ['firstName', 'lastName', 'phoneNumber', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Sider>([]);
  totalCount = 0;
  pageSize = 10;
  currentPageIndex = 0;

  constructor(private service: SidersService, private dialog: MatDialog) {}

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
    const ref = this.dialog.open(SiderDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.currentPageIndex = 0;
      this.load(0, this.pageSize);
    });
  }

  edit(row: Sider) {
    const ref = this.dialog.open(SiderDialogComponent, { width: '500px', data: row });
    ref.afterClosed().subscribe((ok) => ok && this.load(this.currentPageIndex, this.pageSize));
  }

  delete(row: Sider) {
    if (!row?.id) return;
    if (!confirm('Delete this sider?')) return;
    this.service.delete(row.id).subscribe(() => this.load(this.currentPageIndex, this.pageSize));
  }
}
