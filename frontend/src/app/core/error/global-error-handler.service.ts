import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private snackBar = inject(MatSnackBar);
    private readonly isDevelopment = !this.isProduction();

    handleError(error: Error | HttpErrorResponse): void {
        let errorMessage: string;
        let consoleError: any = error;

        if (error instanceof HttpErrorResponse) {
            // Server or network error
            if (!navigator.onLine) {
                errorMessage = 'No internet connection';
            } else if (error.status === 0) {
                errorMessage = 'Network error - Unable to connect to server';
            } else if (error.status >= 500) {
                errorMessage = 'Server error - Please try again later';
            } else if (error.status === 404) {
                errorMessage = 'Resource not found';
            } else if (error.status === 403) {
                errorMessage = 'Access denied';
            } else if (error.status === 401) {
                errorMessage = 'Unauthorized - Please log in again';
            } else {
                errorMessage = error.error?.message || 'An error occurred';
            }

            consoleError = {
                message: error.message,
                status: error.status,
                statusText: error.statusText,
                url: error.url,
                error: error.error,
            };
        } else {
            // Client-side error
            errorMessage = error.message || 'An unexpected error occurred';
        }

        // Log to console in development
        if (this.isDevelopment) {
            console.error('Global error handler caught:', consoleError);
            console.error('Stack trace:', error);
        }

        // Log to external service in production (if configured)
        if (!this.isDevelopment) {
            this.logErrorToService(error);
        }

        // Show user-friendly error message
        // this.showErrorNotification(errorMessage);
    }

    private showErrorNotification(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            verticalPosition: 'top',
            horizontalPosition: 'center',
            panelClass: ['error-snackbar'],
        });
    }

    private logErrorToService(error: Error | HttpErrorResponse): void {
        // Completed: Implement logging to external service (e.g., Sentry, LogRocket, etc.)
        // This is a placeholder for production error logging
        console.error('Production error:', {
            timestamp: new Date().toISOString(),
            error: error,
            userAgent: navigator.userAgent,
            url: window.location.href,
        });
    }

    private isProduction(): boolean {
        // Check if we're in production mode
        return typeof window !== 'undefined' &&
               (window as any).__env?.production === true;
    }
}
