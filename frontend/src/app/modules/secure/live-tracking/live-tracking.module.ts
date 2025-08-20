import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LiveTrackingComponent } from './live-tracking.component';
import { liveTrackingRoutes } from './live-tracking.routing';

@NgModule({
    declarations: [
    ],
    imports     : [
        RouterModule.forChild(liveTrackingRoutes),
        LiveTrackingComponent
    ]
})
export class LiveTrackingModule
{
}
