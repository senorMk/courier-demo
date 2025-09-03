import { Injectable, signal } from '@angular/core';

export interface ScanningSession {
  id: string;
  routeId: string;
  mode: 'bag' | 'individual';
  createMailBag: boolean;
  staffId: string;
  startedAt: Date;
  closedAt?: Date;
  parcels: string[]; // parcel barcodes
  mailBagCode?: string;
}

@Injectable({ providedIn: 'root' })
export class ScanningSessionService {
  private sessions = signal<ScanningSession[]>([]);
  // Temporary in-memory routes list (replace with API call later)
  private _routes = [
    { id: 'R001', name: 'Lusaka Main → Ndola' },
    { id: 'R002', name: 'Lusaka Main → Kitwe' },
    { id: 'R003', name: 'Ndola → Lusaka Return' },
    { id: 'R004', name: 'Kitwe → Kabwe' },
    { id: 'R005', name: 'Copperbelt Consolidated' }
  ];

  getRoutes() {
    return this._routes.slice();
  }

  startSession(opts: { routeId: string; mode: string; createMailBag?: boolean; staffId: string }): ScanningSession {
    const session: ScanningSession = {
      id: Math.random().toString(36).slice(2, 10),
      routeId: opts.routeId,
      mode: opts.mode === 'bag' ? 'bag' : 'individual',
      createMailBag: opts.mode === 'bag' ? true : false,
      staffId: opts.staffId,
      startedAt: new Date(),
      parcels: [],
      mailBagCode: opts.mode === 'bag' ? 'MB-' + Date.now() : undefined,
    };
    this.sessions.update(arr => [...arr, session]);
    return session;
  }

  getSession(id: string): ScanningSession | undefined {
    return this.sessions().find(s => s.id === id);
  }

  scanParcel(sessionId: string, parcelCode: string): { success: boolean; message?: string } {
    const s = this.getSession(sessionId);
    if (!s) return { success: false, message: 'Session not found' };
    if (s.closedAt) return { success: false, message: 'Session is closed' };

    // Simple duplicate check
    if (s.parcels.includes(parcelCode)) {
      return { success: false, message: 'Parcel already scanned' };
    }

    s.parcels.push(parcelCode);
    this.sessions.update(arr => arr.map(x => (x.id === s.id ? { ...s } : x)));
    return { success: true };
  }

  removeParcel(sessionId: string, parcelCode: string) {
    const s = this.getSession(sessionId);
    if (!s) return { success: false, message: 'Session not found' };
    s.parcels = s.parcels.filter(p => p !== parcelCode);
    this.sessions.update(arr => arr.map(x => (x.id === s.id ? { ...s } : x)));
    return { success: true };
  }

  closeSession(sessionId: string): { success: boolean; message?: string } {
    const s = this.getSession(sessionId);
    if (!s) return { success: false, message: 'Session not found' };
    if (s.closedAt) return { success: false, message: 'Already closed' };

    if (s.mode === 'bag' && s.parcels.length < 1) {
      return { success: false, message: 'Mail bag requires at least 10 parcels' };
    }

    s.closedAt = new Date();
    // If no mailBagCode yet but mode bag and enough parcels, assign one
    if (s.mode === 'bag' && !s.mailBagCode) {
      s.mailBagCode = 'MB-' + Date.now();
    }
    this.sessions.update(arr => arr.map(x => (x.id === s.id ? { ...s } : x)));
    return { success: true };
  }
}
