import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export async function listSalesReturns(organizationId: string, params: PageParams) {
  const where: Prisma.SalesReturnWhereInput = {
    organizationId,
    ...(params.q
      ? {
          OR: [
            { returnNo: { contains: params.q, mode: "insensitive" } },
            { order: { orderNo: { contains: params.q, mode: "insensitive" } } },
            { order: { customer: { name: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.salesReturn.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        order: { select: { orderNo: true, customer: { select: { name: true } } } },
        warehouse: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.salesReturn.count({ where }),
  ]);

  return { items, total };
}

export async function getSalesReturn(organizationId: string, id: string) {
  const salesReturn = await prisma.salesReturn.findFirst({
    where: { id, organizationId },
    include: {
      order: { include: { customer: true } },
      warehouse: true,
      createdBy: { select: { name: true } },
      lines: {
        include: {
          variant: { select: { sku: true, name: true } },
          orderLine: { select: { skuSnapshot: true, nameSnapshot: true } },
        },
      },
    },
  });
  if (!salesReturn) return null;

  const payments = await prisma.payment.findMany({
    where: { organizationId, referenceType: "SALES_RETURN", referenceId: salesReturn.id },
    orderBy: { paidAt: "desc" },
  });

  return { ...salesReturn, payments };
}