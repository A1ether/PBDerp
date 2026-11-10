import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export async function listCustomers(organizationId: string, params: PageParams) {
  const where: Prisma.CustomerWhereInput = {
    organizationId,
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { code: { contains: params.q, mode: "insensitive" } },
            { contact: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { _count: { select: { salesOrders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total };
}

export async function listSuppliers(organizationId: string, params: PageParams) {
  const where: Prisma.SupplierWhereInput = {
    organizationId,
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { code: { contains: params.q, mode: "insensitive" } },
            { contact: { contains: params.q, mode: "insensitive" } },
            { phone: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    prisma.supplier.count({ where }),
  ]);

  return { items, total };
}

export async function getCustomer(organizationId: string, id: string) {
  return prisma.customer.findFirst({ where: { id, organizationId } });
}

export async function getSupplier(organizationId: string, id: string) {
  return prisma.supplier.findFirst({ where: { id, organizationId } });
}

export async function listCustomerOptions(organizationId: string) {
  return prisma.customer.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export async function listSupplierOptions(organizationId: string) {
  return prisma.supplier.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export async function countPartners(organizationId: string) {
  const [customers, suppliers] = await Promise.all([
    prisma.customer.count({ where: { organizationId } }),
    prisma.supplier.count({ where: { organizationId } }),
  ]);
  return { customers, suppliers };
}