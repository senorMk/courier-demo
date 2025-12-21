import { Route } from "@angular/router";
import { initialDataResolver } from "app/app.resolvers";
import { AuthGuard } from "app/core/auth/guards/auth.guard";
import { NoAuthGuard } from "app/core/auth/guards/noAuth.guard";
import { SignedInRedirectGuard } from "app/core/auth/guards/signed-in-redirect.guard";
import { getRolesWithFeature, STAFF_ROLES } from "app/core/auth/role-permissions";
import { LayoutComponent } from "app/layout/layout.component";

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [
  // Redirect empty path to '/example'
  { path: "", pathMatch: "full", redirectTo: "sign-in" },

  // Redirect signed-in user to role-based default route
  //
  // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
  // path. The SignedInRedirectGuard will then redirect to the appropriate route based on the user's role.
  {
    path: "signed-in-redirect",
    pathMatch: "full",
    canActivate: [SignedInRedirectGuard],
    children: [],
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
      {
        path: "tracking",
        loadChildren: () =>
          import("app/modules/landing/tracking/tracking.routes"),
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
      allowedRoles: STAFF_ROLES,
    },
    resolve: {
      initialData: initialDataResolver,
    },
    children: [
      {
        path: "dashboard",
        data: {
          allowedRoles: getRolesWithFeature("dashboard"),
        },
        loadChildren: () =>
          import("app/modules/secure/dashboard/dashboard.module").then(
            (m) => m.DashboardModule
          ),
      },
      {
        path: "supervisor-dashboard",
        data: {
          allowedRoles: getRolesWithFeature("supervisor-dashboard"),
        },
        loadComponent: () =>
          import("app/modules/secure/supervisor-dashboard/supervisor-dashboard.component").then(
            (m) => m.SupervisorDashboardComponent
          ),
      },
      {
        path: "parcels-history",
        data: {
          allowedRoles: getRolesWithFeature("parcels-history"),
        },
        loadComponent: () =>
          import(
            "app/modules/secure/parcels-history/parcels-history.component"
          ).then((m) => m.ParcelsHistoryComponent),
      },
      {
        path: "live-tracking",
        data: {
          allowedRoles: getRolesWithFeature("live-tracking"),
        },
        loadComponent: () =>
          import(
            "app/modules/secure/live-tracking/live-tracking.component"
          ).then((m) => m.LiveTrackingComponent),
      },
      {
        path: "reports",
        data: {
          allowedRoles: getRolesWithFeature("reports"),
        },
        loadComponent: () =>
          import("app/modules/secure/reports/reports.component").then(
            (m) => m.ReportsComponent
          ),
      },
      {
        path: "customers",
        data: {
          allowedRoles: getRolesWithFeature("customers"),
        },
        loadChildren: () =>
          import("app/modules/secure/customers/customers.module").then(
            (m) => m.CustomersModule
          ),
      },
      {
        path: "destinations",
        data: {
          allowedRoles: getRolesWithFeature("destinations"),
        },
        loadChildren: () =>
          import("app/modules/secure/destinations/destinations.module").then(
            (m) => m.DestinationsModule
          ),
      },
      {
        path: "parcels",
        data: {
          allowedRoles: getRolesWithFeature("parcels"),
        },
        loadChildren: () =>
          import("app/modules/secure/parcels/parcels.module").then(
            (m) => m.ParcelsModule
          ),
      },
      {
        path: "routes",
        data: {
          allowedRoles: getRolesWithFeature("routes"),
        },
        loadChildren: () =>
          import("app/modules/secure/routes/routes.module").then(
            (m) => m.RoutesModule
          ),
      },
      {
        path: "drivers",
        data: {
          allowedRoles: getRolesWithFeature("drivers"),
        },
        loadChildren: () =>
          import("app/modules/secure/drivers/drivers.module").then(
            (m) => m.DriversModule
          ),
      },
      {
        path: "siders",
        data: {
          allowedRoles: getRolesWithFeature("siders"),
        },
        loadComponent: () =>
          import("app/modules/secure/siders/siders.component").then(
            (m) => m.SidersComponent
          ),
      },
      {
        path: "trucks",
        data: {
          allowedRoles: getRolesWithFeature("trucks"),
        },
        loadChildren: () =>
          import("app/modules/secure/trucks/trucks.module").then(
            (m) => m.TrucksModule
          ),
      },
      {
        path: "scanning",
        data: {
          allowedRoles: getRolesWithFeature("scanning"),
        },
        loadChildren: () =>
          import("app/modules/secure/scanning/scanning.routes"),
      },
      {
        path: "trips",
        data: {
          allowedRoles: getRolesWithFeature("trips"),
        },
        loadComponent: () =>
          import("app/modules/secure/trips/trips.component").then(
            (m) => m.TripsComponent
          ),
      },
      {
        path: "complaints",
        data: {
          allowedRoles: getRolesWithFeature("complaints"),
        },
        loadComponent: () =>
          import("app/modules/secure/complaints/complaints.component").then(
            (m) => m.ComplaintsComponent
          ),
      },
      {
        path: "users",
        data: {
          allowedRoles: ["managing-director"],
        },
        loadChildren: () =>
          import("app/modules/secure/users/users.module").then(
            (m) => m.UsersModule
          ),
      },
    ],
  },
];