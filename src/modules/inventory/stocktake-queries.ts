import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export async function listStockTakes(organizationId: string, params: PageParams) {
  const where: Prisma.StockTakeWhereInput = {
    organizationId,
    ...(params.q
      ? {
          OR: [
            { takeNo: { contains: params.q, mode: "insensitive" } },
            { warehouse: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.stockTake.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        warehouse: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.stockTake.count({ where }),
  ]);

  return { items, total };
}

export async function getStockTake(organizationId: string, id: string) {
  return prisma.stockTake.findFirst({
    where: { id, organizationId },
    include: {
      warehouse: true,
      createdBy: { select: { name: true } },
      lines: {
        include: {
          variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
          location: { select: { code: true, name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });
}