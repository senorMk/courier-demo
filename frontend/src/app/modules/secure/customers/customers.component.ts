import { Component, DestroyRef, OnInit, inject } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { CustomersService, Customer } from "./customers.service";
import { CustomerDialogComponent } from "./customer-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { CommonModule } from "@angular/common";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: "app-customers",
  templateUrl: "./customers.component.html",
  styleUrls: ["./customers.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
  MatIconModule,
  MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
})
export class CustomersComponent implements OnInit {
  displayedColumns: string[] = [
    "firstName",
    "lastName",
    "phoneNumber",
    "emailAddress",
    "idNumber",
    "createdAt"
  ];
  dataSource = new MatTableDataSource<Customer>([]);
  totalCount = 0;
  pageSize = 10;
  currentPageIndex = 0;
  readonly searchControl = new FormControl("", { nonNullable: true });
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private _service: CustomersService,
    private _dialog: MatDialog
  ) {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.currentPageIndex = 0;
        this.loadData(0, this.pageSize);
      });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(pageIndex: number = this.currentPageIndex, pageSize: number = this.pageSize): void {
    const apiPage = pageIndex + 1;
    const search = this.searchControl.value.trim();
    this._service.getCustomers(apiPage, pageSize, search || undefined).subscribe((data) => {
      this.dataSource.data = data.data || [];
      this.totalCount = Number(data.total || 0);
      this.pageSize = data.pageSize || pageSize;
      this.currentPageIndex = (data.page ?? apiPage) - 1;
    });
  }

  clearSearch(): void {
    if (this.searchControl.value) {
      this.searchControl.setValue("");
    }
  }

  onPageChange(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData(event.pageIndex, event.pageSize);
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(CustomerDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }
}
