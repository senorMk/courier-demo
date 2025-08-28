import { Route } from '@angular/router';

export const scanningRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('app/modules/secure/scanning/start/scanning-session-start.component').then(m => m.ScanningSessionStartComponent)
  },
  {
    path: 'session/:id',
    loadComponent: () => import('app/modules/secure/scanning/workspace/scanning-workspace.component').then(m => m.ScanningWorkspaceComponent)
  },
  {
    path: 'session/:id/delivery-note',
    loadComponent: () => import('app/modules/secure/scanning/delivery-note/delivery-note.component').then(m => m.DeliveryNoteComponent)
  }
];

export default scanningRoutes;
