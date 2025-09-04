import { Route } from "@angular/router";
import { initialDataResolver } from "app/app.resolvers";
import { AuthGuard } from "app/core/auth/guards/auth.guard";
import { NoAuthGuard } from "app/core/auth/guards/noAuth.guard";
import { LayoutComponent } from "app/layout/layout.component";

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [
  // Redirect empty path to '/example'
  { path: "", pathMatch: "full", redirectTo: "sign-in" },

  // Redirect signed-in user to the '/example'
  //
  // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
  // path. Below is another redirection for that path to redirect the user to the desired
  // location. This is a small convenience to keep all main routes together here on this file.
  {
    path: "signed-in-redirect",
    pathMatch: "full",
    redirectTo: "secure/dashboard",
  },

  // Auth routes for guests
  {
    path: "",
    canActivate: [NoAuthGuard],
    canActivateChild: [NoAuthGuard],
    component: LayoutComponent,
    data: {
      layout: "empty",
    },
    children: [
      {
        path: "confirmation-required",
        loadChildren: () =>
          import(
            "app/modules/auth/confirmation-required/confirmation-required.routes"
          ),
      },
      {
        path: "forgot-password",
        loadChildren: () =>
          import("app/modules/auth/forgot-password/forgot-password.routes"),
      },
      {
        path: "reset-password",
        loadChildren: () =>
          import("app/modules/auth/reset-password/reset-password.routes"),
      },
      {
        path: "sign-in",
        loadChildren: () => import("app/modules/auth/sign-in/sign-in.routes"),
      },
      {
        path: "sign-up",
        loadChildren: () => import("app/modules/auth/sign-up/sign-up.routes"),
      },
    ],
  },

  // Auth routes for authenticated users
  {
    path: "",
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: LayoutComponent,
    data: {
      layout: "empty",
    },
    children: [
      {
        path: "sign-out",
        loadChildren: () => import("app/modules/auth/sign-out/sign-out.routes"),
      },
      {
        path: "unlock-session",
        loadChildren: () =>
          import("app/modules/auth/unlock-session/unlock-session.routes"),
      },
    ],
  },

  // Landing routes
  {
    path: "",
    component: LayoutComponent,
    data: {
      layout: "empty",
    },
    children: [
      {
        path: "home",
        loadChildren: () => import("app/modules/landing/home/home.routes"),
      },
    ],
  },

  // Admin routes
  {
    path: "secure",
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    component: LayoutComponent,
    data: {
      layout: "classic",
      allowedRoles: ["managing-director"],
    },
    resolve: {
      initialData: initialDataResolver,
    },
    children: [
      {
        path: "dashboard",
        loadChildren: () =>
          import("app/modules/secure/dashboard/dashboard.module").then(
            (m) => m.DashboardModule
          ),
      },
      {
        path: "parcels-history",
        loadComponent: () =>
          import(
            "app/modules/secure/parcels-history/parcels-history.component"
          ).then((m) => m.ParcelsHistoryComponent),
      },
      {
        path: "live-tracking",
        loadComponent: () =>
          import(
            "app/modules/secure/live-tracking/live-tracking.component"
          ).then((m) => m.LiveTrackingComponent),
      },
      {
        path: "revenue",
        loadComponent: () =>
          import("app/modules/secure/revenue/revenue.component").then(
            (m) => m.RevenueComponent
          ),
      },
      {
        path: "customers",
        loadChildren: () =>
          import("app/modules/secure/customers/customers.module").then(
            (m) => m.CustomersModule
          ),
      },
      {
        path: "destinations",
        loadChildren: () =>
          import("app/modules/secure/destinations/destinations.module").then(
            (m) => m.DestinationsModule
          ),
      },
      {
        path: "parcels",
        loadChildren: () =>
          import("app/modules/secure/parcels/parcels.module").then(
            (m) => m.ParcelsModule
          ),
      },
      {
        path: "routes",
        loadChildren: () =>
          import("app/modules/secure/routes/routes.module").then(
            (m) => m.RoutesModule
          ),
      },
      {
        path: "drivers",
        loadChildren: () =>
          import("app/modules/secure/drivers/drivers.module").then(
            (m) => m.DriversModule
          ),
      },
      {
        path: "trucks",
        loadChildren: () =>
          import("app/modules/secure/trucks/trucks.module").then(
            (m) => m.TrucksModule
          ),
      },
      {
        path: "scanning",
        loadChildren: () =>
          import("app/modules/secure/scanning/scanning.routes"),
      },
      {
        path: "trips",
        loadComponent: () =>
          import("app/modules/secure/trips/trips.component").then(
            (m) => m.TripsComponent
          ),
      },
      {
        path: "complaints",
        loadComponent: () =>
          import("app/modules/secure/complaints/complaints.component").then(
            (m) => m.ComplaintsComponent
          ),
      },
    ],
  },
];
