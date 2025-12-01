export type RoleKey =
  | "customer"
  | "cashier"
  | "supervisor"
  | "driver"
  | "assistant-driver"
  | "operations-officer"
  | "managing-director"
  | "customer-service-agent"
  | "customer-service-director"
  | "dispatcher"
  | "sorter"
  | "receiver";

export type FeatureKey =
  | "dashboard"
  | "reports"
  | "reports.revenue"
  | "reports.parcel"
  | "reports.complaint"
  | "reports.trip"
  | "reports.zicta"
  | "scanning"
  | "parcels"
  | "parcels-history"
  | "customers"
  | "routes"
  | "destinations"
  | "trips"
  | "drivers"
  | "siders"
  | "trucks"
  | "complaints"
  | "live-tracking";

export type ReportType =
  | "revenue"
  | "parcel"
  | "complaint"
  | "trip"
  | "zicta";

const ROLE_NAME_ALIASES: Record<string, RoleKey> = {
  "general-manager": "managing-director",
  "generalmanager": "managing-director",
  "managing-director": "managing-director",
  "managingdirector": "managing-director",
  md: "managing-director",
  "branch-manager": "supervisor",
  "branchmanager": "supervisor",
  "supervisor-branch-manager": "supervisor",
  supervisor: "supervisor",
  cashier: "cashier",
  "cashier-sending": "cashier",
  "cashier-sending-office": "cashier",
  "sending-cashier": "cashier",
  "cashier-receiving": "cashier",
  "cashier-receiving-office": "cashier",
  "receiving-cashier": "cashier",
  "operations-officer": "operations-officer",
  "operations": "operations-officer",
  dispatcher: "dispatcher",
  driver: "driver",
  "assistant-driver": "assistant-driver",
  assistantdriver: "assistant-driver",
  customer: "customer",
  "customer-service-agent": "customer-service-agent",
  "customer-service": "customer-service-agent",
  "cs-agent": "customer-service-agent",
  "customer-service-director": "customer-service-director",
  "cs-director": "customer-service-director",
  sorter: "sorter",
  receiver: "receiver",
};

const ROLE_KEYS: RoleKey[] = [
  "customer",
  "cashier",
  "supervisor",
  "driver",
  "assistant-driver",
  "operations-officer",
  "managing-director",
  "customer-service-agent",
  "customer-service-director",
  "dispatcher",
  "sorter",
  "receiver",
];

const ALL_FEATURES: FeatureKey[] = [
  "dashboard",
  "reports",
  "reports.revenue",
  "reports.parcel",
  "reports.complaint",
  "reports.trip",
  "reports.zicta",
  "scanning",
  "parcels",
  "parcels-history",
  "customers",
  "routes",
  "destinations",
  "trips",
  "drivers",
  "siders",
  "trucks",
  "complaints",
  "live-tracking",
];

const ROLE_FEATURES: Record<RoleKey, FeatureKey[]> = {
  customer: [],
  // Cashiers handle parcel creation and customer information only
  cashier: [
    "parcels",
    "customers",
  ],
  supervisor: [
    "dashboard",
    "parcels",
    "parcels-history",
    "customers",
    "reports",
    "reports.revenue",
    "reports.parcel",
    "reports.complaint",
    "scanning",
    "complaints",
    "trips",
  ],
  driver: ["dashboard", "trips", "scanning"],
  "assistant-driver": ["dashboard", "trips", "scanning"],
  "operations-officer": [
    "dashboard",
    "parcels",
    "parcels-history",
    "customers",
    "reports",
    "reports.revenue",
    "reports.parcel",
    "reports.trip",
    "reports.zicta",
    "scanning",
    "routes",
    "destinations",
    "trips",
    "drivers",
    "siders",
    "trucks",
    "live-tracking",
  ],
  "managing-director": [...ALL_FEATURES],
  "customer-service-agent": [
    "dashboard",
    "parcels",
    "parcels-history",
    "customers",
    "complaints",
    "live-tracking",
  ],
  "customer-service-director": [
    "dashboard",
    "parcels",
    "parcels-history",
    "customers",
    "complaints",
    "reports",
    "reports.complaint",
    "live-tracking",
  ],
  dispatcher: [
    "dashboard",
    "scanning",
    "parcels",
    "trips",
    "drivers",
    "siders",
    "trucks",
  ],
  // Sorter scans and sorts parcels at sending office for dispatch
  sorter: [
    "scanning",
    "parcels",
    "parcels-history",
  ],
  // Receiver scans and verifies incoming parcels
  receiver: [
    "scanning",
    "parcels",
    "parcels-history",
  ],
};

const REPORT_TYPE_FEATURE: Record<ReportType, FeatureKey> = {
  revenue: "reports.revenue",
  parcel: "reports.parcel",
  complaint: "reports.complaint",
  trip: "reports.trip",
  zicta: "reports.zicta",
};

export const NAV_ITEM_FEATURE: Record<string, FeatureKey> = {
  dashboard: "dashboard",
  reports: "reports",
  scan: "scanning",
  "parcels-history": "parcels",
  customers: "customers",
  routes: "routes",
  destinations: "destinations",
  trips: "trips",
  drivers: "drivers",
  siders: "siders",
  trucks: "trucks",
  complaints: "complaints",
};

const ROLE_DEFAULT_ROUTE: Record<RoleKey, string> = {
  customer: "/home",
  cashier: "/secure/parcels",
  supervisor: "/secure/dashboard",
  driver: "/secure/trips",
  "assistant-driver": "/secure/trips",
  "operations-officer": "/secure/dashboard",
  "managing-director": "/secure/dashboard",
  "customer-service-agent": "/secure/complaints",
  "customer-service-director": "/secure/complaints",
  dispatcher: "/secure/dashboard",
  sorter: "/secure/scanning",
  receiver: "/secure/scanning",
};

export const REPORT_TYPES: ReportType[] = [
  "revenue",
  "parcel",
  "complaint",
  "trip",
  "zicta",
];

export const STAFF_ROLES: RoleKey[] = ROLE_KEYS.filter(
  (role) => role !== "customer"
);

export function normalizeRoleName(role: unknown): RoleKey | null {
  const raw = coerceRoleToString(role);
  if (!raw) {
    return null;
  }

  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const alias = ROLE_NAME_ALIASES[slug];
  if (alias) {
    return alias;
  }

  return ROLE_KEYS.includes(slug as RoleKey) ? (slug as RoleKey) : null;
}

export function canRoleAccessFeature(
  role: RoleKey | null | undefined,
  feature: FeatureKey
): boolean {
  if (!role) {
    return false;
  }

  const features = ROLE_FEATURES[role];
  return features ? features.includes(feature) : false;
}

export function getRolesWithFeature(feature: FeatureKey): RoleKey[] {
  return ROLE_KEYS.filter((role) => ROLE_FEATURES[role]?.includes(feature));
}

export function getDefaultRouteForRole(
  role: RoleKey | null | undefined
): string | null {
  if (!role) {
    return null;
  }

  return ROLE_DEFAULT_ROUTE[role] ?? null;
}

export function getPermittedReportTypes(
  role: RoleKey | null | undefined
): ReportType[] {
  if (!role) {
    return [];
  }

  return REPORT_TYPES.filter((type) =>
    canRoleAccessFeature(role, REPORT_TYPE_FEATURE[type])
  );
}

export function getFeatureForReportType(
  type: ReportType
): FeatureKey | undefined {
  return REPORT_TYPE_FEATURE[type];
}

function coerceRoleToString(role: unknown): string | null {
  if (!role) {
    return null;
  }

  if (typeof role === "string") {
    return role;
  }

  if (typeof role === "object") {
    const candidate = (role as any).roleName ?? (role as any).name;
    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return null;
}

export function extractRoleName(role: unknown): string | null {
  return coerceRoleToString(role);
}

export function getRoleFeatures(role: RoleKey): FeatureKey[] {
  return ROLE_FEATURES[role] ?? [];
}

export function getReportFeature(type: ReportType): FeatureKey {
  return REPORT_TYPE_FEATURE[type];
}

export function isStaffRole(role: RoleKey | null | undefined): boolean {
  return role ? role !== "customer" : false;
}
