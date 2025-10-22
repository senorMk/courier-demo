import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { usersRoutes } from './users.routing';

@NgModule({
  imports: [RouterModule.forChild(usersRoutes)],
})
export class UsersModule {}
