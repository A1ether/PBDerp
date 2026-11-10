import "server-only";

import type { Prisma, PurchaseOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/money";
import type { PageParams } from "@/lib/pagination";

export async function listPurchaseOrders(
  organizationId: string,
  params: PageParams,
  status?: PurchaseOrderStatus,
) {
  const where: Prisma.PurchaseOrderWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(params.q
      ? {
          OR: [
            { orderNo: { contains: params.q, mode: "insensitive" } },
            { supplier: { name: { contains: params.q, mode: "insensitive" } } },
            { supplier: { code: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        supplier: { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { items, total };
}

export async function getPurchaseOrder(organizationId: string, id: string) {
  const order = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId },
    include: {
      supplier: true,
      warehouse: true,
      createdBy: { select: { name: true } },
      lines: {
        include: { variant: { select: { sku: true, name: true } } },
        orderBy: { id: "asc" },
      },
      receipts: {
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) return null;

  const payments = await prisma.payment.findMany({
    where: { organizationId, referenceType: "PURCHASE_ORDER", referenceId: order.id },
    orderBy: { paidAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return { ...order, payments };
}

export async function purchaseSummary(organizationId: string) {
  const [pendingReceipt, totals] = await Promise.all([
    prisma.purchaseOrder.count({
      where: { organizationId, status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } },
    }),
    prisma.purchaseOrder.aggregate({
      where: {
        organizationId,
        status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"] },
      },
      _sum: { grandTotal: true, paidAmount: true },
    }),
  ]);

  return {
    pendingReceipt,
    payable: dec(totals._sum.grandTotal).minus(dec(totals._sum.paidAmount)),
  };
}