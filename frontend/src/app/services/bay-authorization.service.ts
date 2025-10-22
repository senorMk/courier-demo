import { Injectable, inject } from '@angular/core';
import { UserSelectionService } from './user-selection.service';
import { Observable, map } from 'rxjs';

export enum BayType {
  SENDING = 'SENDING',
  RECEIVING = 'RECEIVING',
  DISPATCH = 'DISPATCH',
}

@Injectable({
  providedIn: 'root',
})
export class BayAuthorizationService {
  private userSelectionService = inject(UserSelectionService);

  /**
   * Check if the current user is authorized for a specific bay type
   */
  isAuthorizedForBay(bayType: BayType | string): boolean {
    const user = this.userSelectionService.getCurrentUser();

    // If no bay types are set, user has access to all bays
    if (!user.authorizedBayTypes || user.authorizedBayTypes.length === 0) {
      return true;
    }

    return user.authorizedBayTypes.includes(bayType);
  }

  /**
   * Get observable that emits whether user is authorized for a bay type
   */
  isAuthorizedForBay$(bayType: BayType | string): Observable<boolean> {
    return this.userSelectionService.selectedUser$.pipe(
      map((user) => {
        if (!user.authorizedBayTypes || user.authorizedBayTypes.length === 0) {
          return true;
        }
        return user.authorizedBayTypes.includes(bayType);
      })
    );
  }

  /**
   * Get all authorized bay types for the current user
   */
  getAuthorizedBayTypes(): string[] {
    const user = this.userSelectionService.getCurrentUser();
    return user.authorizedBayTypes || [];
  }

  /**
   * Get observable of authorized bay types
   */
  getAuthorizedBayTypes$(): Observable<string[]> {
    return this.userSelectionService.selectedUser$.pipe(
      map((user) => user.authorizedBayTypes || [])
    );
  }

  /**
   * Check if user has any bay restrictions (returns false if unrestricted)
   */
  hasRestrictions(): boolean {
    const user = this.userSelectionService.getCurrentUser();
    return user.authorizedBayTypes && user.authorizedBayTypes.length > 0;
  }

  /**
   * Check if user can create parcels (must be authorized for SENDING bay)
   */
  canCreateParcels(): boolean {
    const user = this.userSelectionService.getCurrentUser();

    // If no restrictions, they can create parcels
    if (!user.authorizedBayTypes || user.authorizedBayTypes.length === 0) {
      return true;
    }

    // Must be authorized for SENDING bay to create parcels
    return user.authorizedBayTypes.includes(BayType.SENDING);
  }

  /**
   * Check if user can scan for receiving (must be authorized for RECEIVING bay)
   */
  canScanReceiving(): boolean {
    const user = this.userSelectionService.getCurrentUser();

    if (!user.authorizedBayTypes || user.authorizedBayTypes.length === 0) {
      return true;
    }

    return user.authorizedBayTypes.includes(BayType.RECEIVING);
  }

  /**
   * Check if user can scan for dispatch (must be authorized for DISPATCH bay)
   */
  canScanDispatch(): boolean {
    const user = this.userSelectionService.getCurrentUser();

    if (!user.authorizedBayTypes || user.authorizedBayTypes.length === 0) {
      return true;
    }

    return user.authorizedBayTypes.includes(BayType.DISPATCH);
  }
}
