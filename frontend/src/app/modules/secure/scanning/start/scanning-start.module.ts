import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScanningSessionStartComponent } from './scanning-session-start.component';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTableModule,
    ScanningSessionStartComponent
  ],
  exports: [ScanningSessionStartComponent]
})
export class ScanningStartModule {}
