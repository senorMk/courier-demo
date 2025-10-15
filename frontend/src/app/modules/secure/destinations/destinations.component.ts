import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatTableDataSource } from "@angular/material/table";
import { MatPaginator, MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatDialog } from "@angular/material/dialog";
import { DestinationsService, Destination } from "./destinations.service";
import { DestinationDialogComponent } from "./destination-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatIconModule } from "@angular/material/icon";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith, takeUntil } from "rxjs/operators";

@Component({
  selector: "app-destinations",
  templateUrl: "./destinations.component.html",
  styleUrls: ["./destinations.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
})
export class DestinationsComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    "name",
    "routeName",
    "areaCode",
    "branchCode",
    "officeTypes",
    "createdAt",
    "actions",
  ];
  dataSource = new MatTableDataSource<Destination>([]);
  @ViewChild(MatPaginator) paginator: MatPaginator;
  searchControl = new FormControl<string>("");
  totalCount = 0;
  currentPageIndex = 0;
  pageSize = 10;
  currentSearchTerm = "";
  private readonly destroy$ = new Subject<void>();

  constructor(
    private _service: DestinationsService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(this.searchControl.value ?? ""),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        const value = term?.trim() ?? "";
        const hasChanged = value !== this.currentSearchTerm;
        this.currentSearchTerm = value;
        this.currentPageIndex = 0;
        this.paginator?.firstPage();
        if (hasChanged || this.dataSource.data.length === 0) {
          this.loadData(0, this.pageSize, this.currentSearchTerm);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(
    pageIndex: number = this.currentPageIndex,
    pageSize: number = this.pageSize,
    search: string = this.currentSearchTerm
  ): void {
    const apiPage = pageIndex + 1;
    this._service.getDestinations(apiPage, pageSize, search).subscribe((data) => {
      this.dataSource.data = data.data || [];
      this.totalCount = data.total || 0;
      this.pageSize = data.pageSize || pageSize;
      this.currentPageIndex = apiPage - 1;
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData(event.pageIndex, event.pageSize, this.currentSearchTerm);
  }

  clearSearch(): void {
    this.searchControl.setValue("", { emitEvent: true });
  }

  openCreateDialog(): void {
    const dialogRef = this._dialog.open(DestinationDialogComponent, {
      width: "400px",
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  openEditDialog(row: Destination): void {
    const dialogRef = this._dialog.open(DestinationDialogComponent, {
      width: "400px",
      data: { office: row },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData(this.currentPageIndex, this.pageSize, this.currentSearchTerm);
      }
    });
  }

  delete(row: Destination): void {
    if (!row?.id) return;
    if (!confirm(`Delete office "${row.name}"? This cannot be undone.`)) return;
    this._service.deleteDestination(row.id).subscribe(() => {
      this.loadData(this.currentPageIndex, this.pageSize, this.currentSearchTerm);
    });
  }
}
