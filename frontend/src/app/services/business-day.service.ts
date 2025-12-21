import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Business day tracking for cashier workspaces
 * Automatically detects and initializes a new business day
 */
@Injectable({
  providedIn: 'root',
})
export class BusinessDayService {
  private readonly STORAGE_KEY = 'businessDay';
  private readonly businessDaySubject: BehaviorSubject<BusinessDay>;

  constructor() {
    const stored = this.loadFromStorage();
    const current = this.getCurrentBusinessDay();

    // Check if we need to initialize a new business day
    if (!stored || !this.isSameDay(stored.date, current.date)) {
      this.businessDaySubject = new BehaviorSubject<BusinessDay>(current);
      this.saveToStorage(current);
    } else {
      this.businessDaySubject = new BehaviorSubject<BusinessDay>(stored);
    }
  }

  /**
   * Get the current business day as an observable
   */
  get businessDay$(): Observable<BusinessDay> {
    return this.businessDaySubject.asObservable();
  }

  /**
   * Get the current business day value
   */
  get currentBusinessDay(): BusinessDay {
    return this.businessDaySubject.value;
  }

  /**
   * Check if the current business day is today
   */
  isCurrentBusinessDay(): boolean {
    const current = this.businessDaySubject.value;
    const today = new Date();
    return this.isSameDay(current.date, today.toISOString());
  }

  /**
   * Manually reset/initialize a new business day
   */
  initializeNewBusinessDay(): BusinessDay {
    const newDay = this.getCurrentBusinessDay();
    this.businessDaySubject.next(newDay);
    this.saveToStorage(newDay);
    return newDay;
  }

  /**
   * Get business day information
   */
  private getCurrentBusinessDay(): BusinessDay {
    const now = new Date();
    return {
      date: now.toISOString(),
      dateString: now.toLocaleDateString(),
      timestamp: now.getTime(),
      initialized: true,
    };
  }

  /**
   * Check if two date strings represent the same day
   */
  private isSameDay(date1: string, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Save business day to localStorage
   */
  private saveToStorage(day: BusinessDay): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(day));
    } catch (error) {
      console.error('Failed to save business day to storage', error);
    }
  }

  /**
   * Load business day from localStorage
   */
  private loadFromStorage(): BusinessDay | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load business day from storage', error);
      return null;
    }
  }
}

export interface BusinessDay {
  date: string;
  dateString: string;
  timestamp: number;
  initialized: boolean;
}