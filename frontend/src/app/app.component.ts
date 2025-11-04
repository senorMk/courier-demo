import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
    /**
     * Constructor
     */
    constructor(private router: Router) {
        console.log('🏗️ [APP_COMPONENT] Constructor called');
        this.setupRouterLogging();
    }

    ngOnInit(): void {
        console.log('🎬 [APP_COMPONENT] ngOnInit called - App component initialized');
    }

    ngOnDestroy(): void {
        console.log('🔚 [APP_COMPONENT] ngOnDestroy called - App component destroyed');
    }

    private setupRouterLogging(): void {
        // Log navigation start
        this.router.events
            .pipe(filter(event => event instanceof NavigationStart))
            .subscribe((event: NavigationStart) => {
                console.log(`🧭 [ROUTER] Navigation started to: ${event.url}`);
            });

        // Log navigation end
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                console.log(`✅ [ROUTER] Navigation completed to: ${event.urlAfterRedirects}`);
            });

        // Log navigation cancel
        this.router.events
            .pipe(filter(event => event instanceof NavigationCancel))
            .subscribe((event: NavigationCancel) => {
                console.warn(`⚠️ [ROUTER] Navigation cancelled to: ${event.url}`, event.reason);
            });

        // Log navigation error
        this.router.events
            .pipe(filter(event => event instanceof NavigationError))
            .subscribe((event: NavigationError) => {
                console.error(`❌ [ROUTER] Navigation error to: ${event.url}`, event.error);
            });
    }
}
