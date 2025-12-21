import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * View mode for cashier interface
 * Controls customer-safe vs cashier view modes
 */
export type ViewMode = 'customer' | 'cashier';

@Injectable({
  providedIn: 'root',
})
export class ViewModeService {
  private readonly STORAGE_KEY = 'viewMode';
  private readonly viewModeSubject: BehaviorSubject<ViewMode>;

  constructor() {
    // Default to customer view (customer-safe mode)
    const stored = this.loadFromStorage();
    this.viewModeSubject = new BehaviorSubject<ViewMode>(stored || 'customer');
  }

  /**
   * Get the current view mode as an observable
   */
  get viewMode$(): Observable<ViewMode> {
    return this.viewModeSubject.asObservable();
  }

  /**
   * Get the current view mode value
   */
  get currentViewMode(): ViewMode {
    return this.viewModeSubject.value;
  }

  /**
   * Check if currently in customer view mode
   */
  isCustomerView(): boolean {
    return this.viewModeSubject.value === 'customer';
  }

  /**
   * Check if currently in cashier view mode
   */
  isCashierView(): boolean {
    return this.viewModeSubject.value === 'cashier';
  }

  /**
   * Set the view mode
   */
  setViewMode(mode: ViewMode): void {
    this.viewModeSubject.next(mode);
    this.saveToStorage(mode);
  }

  /**
   * Toggle between customer and cashier view
   */
  toggleViewMode(): ViewMode {
    const newMode: ViewMode = this.isCustomerView() ? 'cashier' : 'customer';
    this.setViewMode(newMode);
    return newMode;
  }

  /**
   * Reset to customer view (default, customer-safe mode)
   */
  resetToCustomerView(): void {
    this.setViewMode('customer');
  }

  /**
   * Save view mode to localStorage
   */
  private saveToStorage(mode: ViewMode): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save view mode to storage', error);
    }
  }

  /**
   * Load view mode from localStorage
   */
  private loadFromStorage(): ViewMode | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return (stored === 'customer' || stored === 'cashier') ? stored : null;
    } catch (error) {
      console.error('Failed to load view mode from storage', error);
      return null;
    }
  }
}