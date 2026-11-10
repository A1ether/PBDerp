import "server-only";

import type { Prisma, StockMovementType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export type StockFilters = {
  q?: string;
  warehouseId?: string;
  lowStock?: boolean;
};

export async function listStockLevels(
  organizationId: string,
  filters: StockFilters,
  params: PageParams,
) {
  const where: Prisma.StockLevelWhereInput = {
    organizationId,
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.q
      ? {
          variant: {
            is: {
              OR: [
                { sku: { contains: filters.q, mode: "insensitive" } },
                { name: { contains: filters.q, mode: "insensitive" } },
                { product: { name: { contains: filters.q, mode: "insensitive" } } },
              ],
            },
          },
        }
      : {}),
  };

  // Low-stock comparison needs a column-to-column check, which Prisma filters cannot
  // express. For MVP stock volumes we fetch a bounded window and filter in memory.
  const all = await prisma.stockLevel.findMany({
    where,
    orderBy: [{ warehouse: { name: "asc" } }, { variant: { sku: "asc" } }],
    take: 2000,
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      location: { select: { id: true, code: true, name: true } },
      variant: {
        select: {
          id: true,
          sku: true,
          name: true,
          reorderPoint: true,
          product: { select: { name: true, code: true } },
        },
      },
    },
  });

  const filtered = filters.lowStock
    ? all.filter(
        (level) =>
          level.variant.reorderPoint.gt(0) &&
          level.quantity.minus(level.reservedQuantity).lte(level.variant.reorderPoint),
      )
    : all;

  const total = filtered.length;
  const items = filtered.slice((params.page - 1) * params.pageSize, params.page * params.pageSize);

  return { items, total };
}

export type MovementFilters = {
  q?: string;
  warehouseId?: string;
  type?: StockMovementType;
};

export async function listMovements(
  organizationId: string,
  filters: MovementFilters,
  params: PageParams,
) {
  const where: Prisma.StockMovementWhereInput = {
    organizationId,
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.q
      ? {
          OR: [
            { variant: { sku: { contains: filters.q, mode: "insensitive" } } },
            { variant: { product: { name: { contains: filters.q, mode: "insensitive" } } } },
            { referenceId: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        warehouse: { select: { name: true } },
        location: { select: { code: true } },
        variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, total };
}

export async function listLowStock(organizationId: string, limit = 10) {
  const levels = await prisma.stockLevel.findMany({
    where: {
      organizationId,
      variant: { status: "ACTIVE", reorderPoint: { gt: 0 }, product: { status: "ACTIVE" } },
    },
    include: {
      variant: {
        select: {
          sku: true,
          name: true,
          reorderPoint: true,
          product: { select: { name: true } },
        },
      },
      warehouse: { select: { name: true } },
      location: { select: { code: true } },
    },
    take: 200,
  });

  return levels
    .filter((level) => level.quantity.minus(level.reservedQuantity).lte(level.variant.reorderPoint))
    .sort((a, b) => {
      const aGap = a.quantity.minus(a.reservedQuantity).minus(a.variant.reorderPoint).toNumber();
      const bGap = b.quantity.minus(b.reservedQuantity).minus(b.variant.reorderPoint).toNumber();
      return aGap - bGap;
    })
    .slice(0, limit);
}