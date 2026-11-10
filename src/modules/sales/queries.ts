import "server-only";

import type { Prisma, SalesOrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dec } from "@/lib/money";
import type { PageParams } from "@/lib/pagination";

export async function listSalesOrders(
  organizationId: string,
  params: PageParams,
  status?: SalesOrderStatus,
) {
  const where: Prisma.SalesOrderWhereInput = {
    organizationId,
    ...(status ? { status } : {}),
    ...(params.q
      ? {
          OR: [
            { orderNo: { contains: params.q, mode: "insensitive" } },
            { customer: { name: { contains: params.q, mode: "insensitive" } } },
            { customer: { code: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      orderBy: { createdAt: params.dir },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        customer: { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return { items, total };
}

export async function getSalesOrder(organizationId: string, id: string) {
  const order = await prisma.salesOrder.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      warehouse: true,
      createdBy: { select: { name: true } },
      lines: {
        include: { variant: { select: { sku: true, name: true } } },
        orderBy: { id: "asc" },
      },
      shipments: {
        include: { lines: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) return null;

  const payments = await prisma.payment.findMany({
    where: { organizationId, referenceType: "SALES_ORDER", referenceId: order.id },
    orderBy: { paidAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return { ...order, payments };
}

export async function salesSummary(organizationId: string) {
  const today = startOfToday();
  const [orderCount, pendingShipment, todayOrders, totals, todayTotals] = await Promise.all([
    prisma.salesOrder.count({ where: { organizationId, status: { not: "CANCELLED" } } }),
    prisma.salesOrder.count({ where: { organizationId, status: "CONFIRMED" } }),
    prisma.salesOrder.count({
      where: { organizationId, status: { in: ["CONFIRMED", "SHIPPED", "COMPLETED"] }, orderedAt: { gte: today } },
    }),
    prisma.salesOrder.aggregate({
      where: { organizationId, status: { in: ["CONFIRMED", "SHIPPED", "COMPLETED"] } },
      _sum: { grandTotal: true, paidAmount: true },
    }),
    prisma.salesOrder.aggregate({
      where: { organizationId, status: { in: ["CONFIRMED", "SHIPPED", "COMPLETED"] }, orderedAt: { gte: today } },
      _sum: { grandTotal: true },
    }),
  ]);

  return {
    orderCount,
    pendingShipment,
    todayOrders,
    receivable: dec(totals._sum.grandTotal).minus(dec(totals._sum.paidAmount)),
    todaySales: dec(todayTotals._sum.grandTotal),
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}