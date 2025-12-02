import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { RoleKey } from 'app/core/auth/role-permissions';
import { RoleService } from 'app/core/auth/role.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { map, Observable, ReplaySubject, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private _httpClient = inject(HttpClient);
    private _roleService = inject(RoleService);
    private _navigation: ReplaySubject<Navigation> =
        new ReplaySubject<Navigation>(1);

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for navigation
     */
    get navigation$(): Observable<Navigation> {
        return this._navigation.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private getToken() {
        return localStorage.getItem('accessToken');
    }

    private getHeader() {
        const httpOptions = {
            headers: new HttpHeaders({
                Authorization: `Bearer ${this.getToken()}`,
            }),
        };
        return httpOptions;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get all navigation data
     */
    get(): Observable<Navigation> {
        return this._httpClient.get<Navigation>('api/common/navigation', this.getHeader()).pipe(
            map((navigation) => this._filterNavigationByRole(navigation)),
            tap((navigation) => {
                this._navigation.next(navigation);
            })
        );
    }

    private _filterNavigationByRole(navigation: Navigation): Navigation {
        const role = this._roleService.role;

        const filterItems = (
            items: FuseNavigationItem[] | undefined
        ): FuseNavigationItem[] => {
            if (!items) {
                return [];
            }

            return items
                .map<FuseNavigationItem | null>((item) => {
                    const children = filterItems(item.children);
                    const isAllowed =
                        this._isItemAllowed(item, role) || children.length > 0;

                    if (!isAllowed) {
                        return null;
                    }

                    return {
                        ...item,
                        ...(children.length > 0 ? { children } : {}),
                    };
                })
                .filter((item): item is FuseNavigationItem => item !== null);
        };

        return {
            compact: filterItems(navigation.compact),
            default: filterItems(navigation.default),
            futuristic: filterItems(navigation.futuristic),
            horizontal: filterItems(navigation.horizontal),
        };
    }

    private _isItemAllowed(item: FuseNavigationItem, role: RoleKey | null): boolean {
        const allowedRoles = item.meta?.allowedRoles as RoleKey[] | undefined;

        if (!allowedRoles || allowedRoles.length === 0) {
            return true;
        }

        if (!role) {
            return false;
        }

        return allowedRoles.includes(role);
    }
}
