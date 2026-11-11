import type { AppRole } from "@/lib/roles";

export const PERMISSIONS = [
  "dashboard.read",
  "products.read",
  "products.write",
  "partners.read",
  "partners.write",
  "warehouse.read",
  "warehouse.write",
  "inventory.read",
  "inventory.write",
  "inventory.transfer",
  "sales.read",
  "sales.write",
  "sales.ship",
  "purchase.read",
  "purchase.write",
  "purchase.receive",
  "finance.read",
  "finance.write",
  "channels.read",
  "channels.write",
  "settings.read",
  "settings.write",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const READ_ONLY: Permission[] = [
  "dashboard.read",
  "products.read",
  "partners.read",
  "warehouse.read",
  "inventory.read",
  "sales.read",
  "purchase.read",
  "finance.read",
  "channels.read",
  "settings.read",
];

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(PERMISSIONS),
  MANAGER: new Set(PERMISSIONS.filter((p) => p !== "settings.write")),
  SALES: new Set([
    "dashboard.read",
    "products.read",
    "partners.read",
    "partners.write",
    "sales.read",
    "sales.write",
    "channels.read",
    "finance.read",
  ]),
  PURCHASER: new Set([
    "dashboard.read",
    "products.read",
    "partners.read",
    "partners.write",
    "purchase.read",
    "purchase.write",
    "channels.read",
    "finance.read",
  ]),
  WAREHOUSE: new Set([
    "dashboard.read",
    "products.read",
    "warehouse.read",
    "warehouse.write",
    "inventory.read",
    "inventory.write",
    "inventory.transfer",
    "sales.read",
    "sales.ship",
    "purchase.read",
    "purchase.receive",
  ]),
  FINANCE: new Set([
    "dashboard.read",
    "sales.read",
    "purchase.read",
    "finance.read",
    "finance.write",
    "partners.read",
  ]),
  VIEWER: new Set(READ_ONLY),
};

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function permissionsFor(role: AppRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}