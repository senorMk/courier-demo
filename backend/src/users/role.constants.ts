export const DEFAULT_BACKOFFICE_ROLE_NAMES = [
  "managing-director",
  "operations-officer",
  "dispatcher",
  "supervisor",
  "cashier",
  "receiver",
  "sorter",
  "driver",
  "assistant-driver",
  "customer-service-agent",
  "customer-service-director",
] as const;

export type DefaultBackOfficeRoleName =
  (typeof DEFAULT_BACKOFFICE_ROLE_NAMES)[number];
