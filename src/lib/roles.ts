export const USER_ROLES = [
  "ADMIN",
  "MANAGER",
  "SALES",
  "PURCHASER",
  "WAREHOUSE",
  "FINANCE",
  "VIEWER",
] as const;

export type AppRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "管理员",
  MANAGER: "运营经理",
  SALES: "销售",
  PURCHASER: "采购",
  WAREHOUSE: "仓库",
  FINANCE: "财务",
  VIEWER: "只读",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}