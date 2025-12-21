import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { NgxBarcode6Module } from 'ngx-barcode6';
import { ParcelTrackingInfo, ParcelTrackingService } from 'app/modules/auth/parcel-tracking.service';
import { ParcelStatus } from 'app/shared/parcel-status.enum';

@Component({
    selector: 'landing-tracking',
    templateUrl: './tracking.component.html',
    styles: [],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        NgxBarcode6Module,
    ],
})
export class LandingTrackingComponent implements OnInit {
    trackingForm: UntypedFormGroup;
    trackingAlert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    showTrackingAlert = false;
    parcelInfo: ParcelTrackingInfo | null = null;
    isTrackingLoading = false;
    private readonly destroyRef = inject(DestroyRef);
    private lastHandledCode: string | null = null;

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _parcelTrackingService: ParcelTrackingService,
        private _route: ActivatedRoute,
        private _router: Router,
    ) {}

    ngOnInit(): void {
        this.trackingForm = this._formBuilder.group({
            trackingNumber: ['', [Validators.required]],
        });

        this._route.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const code = (params.get('code') ?? '').trim();
                if (!code || code === this.lastHandledCode) {
                    return;
                }

                this.trackingForm.patchValue({ trackingNumber: code }, { emitEvent: false });
                this.trackParcel(false);
            });
    }

    trackParcel(updateQueryParam: boolean = true): void {
        if (this.trackingForm.invalid) {
            this.trackingForm.markAllAsTouched();
            return;
        }

        const rawValue = this.trackingForm.get('trackingNumber')?.value ?? '';
        const trackingNumber = rawValue.trim().toUpperCase();

        if (!trackingNumber) {
            this.trackingForm.get('trackingNumber')?.setValue('', { emitEvent: false });
            return;
        }

        if (rawValue !== trackingNumber) {
            this.trackingForm.patchValue({ trackingNumber }, { emitEvent: false });
        }

        if (updateQueryParam) {
            this._router.navigate([], {
                relativeTo: this._route,
                queryParams: { code: trackingNumber },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });
        }

        this.lastHandledCode = trackingNumber;
        this.trackingForm.disable();
        this.isTrackingLoading = true;
        this.showTrackingAlert = false;
        this.parcelInfo = null;

        this._parcelTrackingService
            .trackParcel(trackingNumber)
            .pipe(
                finalize(() => {
                    this.isTrackingLoading = false;
                    this.trackingForm.enable();
                }),
            )
            .subscribe({
                next: (info) => {
                    const trackingHistory = this.buildTrackingHistory(info);
                    this.parcelInfo = {
                        ...info,
                        trackingHistory,
                    };
                },
                error: (err) => {
                    this.parcelInfo = null;
                    const message = err?.error?.message || 'Tracking number not found. Please check and try again.';
                    this.trackingAlert = {
                        type: 'error',
                        message,
                    };
                    this.showTrackingAlert = true;
                },
            });
    }

    private buildTrackingHistory(info: ParcelTrackingInfo) {
        const history: Array<{ status: ParcelStatus | string; location: string; timestamp: string; description: string }> = [];

        const createdAt = info.createdAt ? new Date(info.createdAt).toISOString() : new Date().toISOString();
        const currentTs = info.currentLocation?.timestamp || createdAt;
        const deliveredTs = info.deliveredAt || info.currentLocation?.timestamp || createdAt;

        history.push({
            status: ParcelStatus.PENDING,
            location: info.destination?.name || 'Sender Office',
            timestamp: createdAt,
            description: 'Parcel received at sender office',
        });

        if ([ParcelStatus.IN_TRANSIT, ParcelStatus.READY_FOR_COLLECTION, ParcelStatus.COLLECTED, ParcelStatus.DELIVERED].includes((info.status || '').toUpperCase() as ParcelStatus)) {
            history.push({
                status: ParcelStatus.IN_TRANSIT,
                location: info.currentLocation?.name || 'In Transit',
                timestamp: currentTs,
                description: 'Parcel in transit to destination',
            });
        }

        if ([ParcelStatus.READY_FOR_COLLECTION, ParcelStatus.COLLECTED, ParcelStatus.DELIVERED].includes((info.status || '').toUpperCase() as ParcelStatus)) {
            history.push({
                status: ParcelStatus.READY_FOR_COLLECTION,
                location: info.destination?.name || info.currentLocation?.name || 'Destination office',
                timestamp: currentTs,
                description: 'Parcel ready for collection at destination office',
            });
        }

        if ([ParcelStatus.COLLECTED, ParcelStatus.DELIVERED].includes((info.status || '').toUpperCase() as ParcelStatus)) {
            history.push({
                status: ParcelStatus.DELIVERED,
                location: info.destination?.name || info.currentLocation?.name || 'Destination office',
                timestamp: deliveredTs,
                description: 'Parcel collected by recipient',
            });
        }

        if ([ParcelStatus.DAMAGED, ParcelStatus.COMPLAINT_BOX, ParcelStatus.DELETED, ParcelStatus.CANCELLED].includes((info.status || '').toUpperCase() as ParcelStatus)) {
            history.push({
                status: (info.status || '').toUpperCase(),
                location: info.currentLocation?.name || info.destination?.name || 'N/A',
                timestamp: currentTs,
                description: this.formatStatusText(info.status),
            });
        }

        return history;
    }

    getStatusBadgeClass(status: string): string {
        const current = (status || '').toUpperCase() as ParcelStatus;
        switch (current) {
            case ParcelStatus.DELIVERED:
            case ParcelStatus.COLLECTED:
                return 'bg-green-100 text-green-800';
            case ParcelStatus.READY_FOR_COLLECTION:
                return 'bg-amber-100 text-amber-800';
            case ParcelStatus.IN_TRANSIT:
                return 'bg-blue-100 text-blue-800';
            case ParcelStatus.PENDING:
                return 'bg-yellow-100 text-yellow-800';
            case ParcelStatus.DAMAGED:
            case ParcelStatus.COMPLAINT_BOX:
            case ParcelStatus.DELETED:
            case ParcelStatus.CANCELLED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    formatStatusText(status: string): string {
        if (!status) {
            return '';
        }

        return status
            .toLowerCase()
            .split('_')
            .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
            .join(' ');
    }

    isDeliveredStatus(status: string): boolean {
        const current = (status || '').toUpperCase() as ParcelStatus;
        return [ParcelStatus.READY_FOR_COLLECTION, ParcelStatus.COLLECTED, ParcelStatus.DELIVERED].includes(current);
    }
}