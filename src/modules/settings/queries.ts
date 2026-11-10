import "server-only";

import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export async function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}

export async function listUsers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      emailVerified: true,
    },
  });
}

export async function listAuditLogs(organizationId: string, params: PageParams) {
  const where = { organizationId };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total };
}