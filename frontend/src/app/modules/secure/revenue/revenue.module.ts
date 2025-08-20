import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RevenueComponent } from './revenue.component';
import { revenueRoutes } from './revenue.routing';

@NgModule({
    declarations: [
    ],
    imports     : [
        RouterModule.forChild(revenueRoutes),
        RevenueComponent
    ]
})
export class RevenueModule
{
}
