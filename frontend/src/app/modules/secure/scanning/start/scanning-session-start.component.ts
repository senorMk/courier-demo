import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ScanningSessionService } from 'app/modules/secure/scanning/scanning-session.service';

@Component({
  selector: 'scanning-session-start',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatRadioModule, MatIconModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule],
  templateUrl: './scanning-session-start.component.html'
})
export class ScanningSessionStartComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private scanningService = inject(ScanningSessionService);

  routes = signal<any[]>(this.scanningService.getRoutes());
  filteredRoutes = computed(() => {
    const q = (this.form.controls.routeSearch?.value || '').toLowerCase();
    if (!q) return this.routes();
    return this.routes().filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  });

  form = this.fb.group({
    staffId: ['', Validators.required],
    routeId: ['', Validators.required],
    routeSearch: [''],
    mode: ['individual', Validators.required]
  });

  selectRoute(r: any) {
    this.form.patchValue({ routeId: r.id, routeSearch: r.name });
  }

  start() {
  if (this.form.invalid) return;
    const value = this.form.value;
    const session = this.scanningService.startSession({
      routeId: value.routeId!,
      mode: value.mode!,
      staffId: value.staffId!
    });
    this.router.navigate(['/secure/scanning/session', session.id]);
  }
}
