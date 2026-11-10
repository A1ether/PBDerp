import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { can, type Permission } from "@/lib/permissions";
import { isAppRole, type AppRole } from "@/lib/roles";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export type AppSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function roleOf(session: AppSession): AppRole {
  const role = session.user.role;
  return isAppRole(role) ? role : "VIEWER";
}

export function organizationIdOf(session: AppSession): string {
  const organizationId = session.user.organizationId;
  if (!organizationId) {
    throw new AppError("UNAUTHORIZED", "当前账号未绑定组织，请联系管理员。");
  }
  return organizationId;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  const role = roleOf(session);

  if (!can(role, permission)) {
    throw new AppError("FORBIDDEN", "当前角色无权执行此操作。");
  }

  return {
    session,
    role,
    user: session.user,
    organizationId: organizationIdOf(session),
  };
}

export async function requireAnyPermission(permissions: Permission[]) {
  const session = await requireSession();
  const role = roleOf(session);

  if (!permissions.some((permission) => can(role, permission))) {
    throw new AppError("FORBIDDEN", "当前角色无权执行此操作。");
  }

  return {
    session,
    role,
    user: session.user,
    organizationId: organizationIdOf(session),
  };
}