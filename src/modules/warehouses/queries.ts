import "server-only";

import { prisma } from "@/lib/db";

export async function listWarehouses(organizationId: string) {
  return prisma.warehouse.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { locations: true, stockLevels: true } },
    },
  });
}

export async function getWarehouse(organizationId: string, id: string) {
  return prisma.warehouse.findFirst({
    where: { id, organizationId },
    include: {
      locations: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { stockLevels: true } },
        },
      },
    },
  });
}

export async function listWarehouseOptions(organizationId: string) {
  return prisma.warehouse.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, isDefault: true },
  });
}

export async function listLocationOptions(organizationId: string, warehouseId?: string) {
  return prisma.warehouseLocation.findMany({
    where: { organizationId, status: "ACTIVE", ...(warehouseId ? { warehouseId } : {}) },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, warehouseId: true },
  });
}