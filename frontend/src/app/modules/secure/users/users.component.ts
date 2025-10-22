import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { User, UsersService } from './users.service';
import { UserDialogComponent } from './user-dialog.component';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
  ],
})
export class UsersComponent implements OnInit {
  displayedColumns = [
    'email',
    'firstName',
    'lastName',
    'role',
    'office',
    'authorizedBayTypes',
    'createdAt',
    'actions',
  ];
  dataSource = new MatTableDataSource<User>([]);
  totalCount = 0;
  pageSize = 20;
  currentPageIndex = 0;

  constructor(
    private service: UsersService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(pageIndex: number = this.currentPageIndex, pageSize: number = this.pageSize) {
    const apiPage = pageIndex + 1;
    this.service.getUsers(apiPage, pageSize).subscribe((res) => {
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
    const ref = this.dialog.open(UserDialogComponent, { width: '600px' });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.currentPageIndex = 0;
      this.load(0, this.pageSize);
    });
  }

  edit(row: User) {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '600px',
      data: row,
    });
    ref.afterClosed().subscribe((ok) => ok && this.load(this.currentPageIndex, this.pageSize));
  }

  delete(row: User) {
    if (!row?.id) return;
    if (!confirm(`Delete user ${row.email}? This action cannot be undone.`)) return;
    this.service.deleteUser(row.id).subscribe({
      next: () => this.load(this.currentPageIndex, this.pageSize),
      error: (err) => {
        alert(err.error?.message || 'Failed to delete user');
      },
    });
  }
}
