import "server-only";

import { prisma } from "@/lib/db";
import { dec } from "@/lib/money";
import { listLowStock } from "@/modules/inventory/queries";
import { lowStockCount, stockValue } from "@/modules/inventory/service";
import { purchaseSummary } from "@/modules/purchases/queries";
import { salesSummary } from "@/modules/sales/queries";

export async function salesTrend(organizationId: string, days = 7) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const rows = await prisma.$queryRaw<Array<{ day: string; total: string; orders: bigint }>>`
    SELECT to_char("orderedAt", 'YYYY-MM-DD') AS "day",
           SUM("grandTotal")::text AS "total",
           COUNT(*)::bigint AS "orders"
    FROM "SalesOrder"
    WHERE "organizationId" = ${organizationId}
      AND "status" IN ('CONFIRMED', 'SHIPPED', 'COMPLETED')
      AND "orderedAt" >= ${since}
    GROUP BY 1
    ORDER BY 1
  `;

  const byDay = new Map(rows.map((row) => [row.day, row]));
  const result: Array<{ day: string; total: number; orders: number }> = [];

  for (let index = 0; index < days; index += 1) {
    const date = new Date(since);
    date.setDate(since.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);
    result.push({
      day: key,
      total: row ? Number(row.total) : 0,
      orders: row ? Number(row.orders) : 0,
    });
  }

  return result;
}

export async function topProducts(organizationId: string, limit = 8) {
  const rows = await prisma.$queryRaw<
    Array<{ sku: string; name: string; quantity: string; revenue: string }>
  >`
    SELECT sol."skuSnapshot" AS "sku",
           sol."nameSnapshot" AS "name",
           SUM(sol."quantity")::text AS "quantity",
           SUM(sol."lineTotal")::text AS "revenue"
    FROM "SalesOrderLine" sol
    JOIN "SalesOrder" so ON so."id" = sol."orderId"
    WHERE so."organizationId" = ${organizationId}
      AND so."status" IN ('CONFIRMED', 'SHIPPED', 'COMPLETED')
    GROUP BY 1, 2
    ORDER BY SUM(sol."lineTotal") DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    sku: row.sku,
    name: row.name,
    quantity: dec(row.quantity),
    revenue: dec(row.revenue),
  }));
}

export async function receivables(organizationId: string, limit = 20) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      organizationId,
      status: { in: ["CONFIRMED", "SHIPPED", "COMPLETED"] },
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    orderBy: { orderedAt: "asc" },
    take: limit,
    include: { customer: { select: { name: true, code: true } } },
  });
  return orders.map((order) => ({ ...order, balance: order.grandTotal.minus(order.paidAmount) }));
}

export async function payables(organizationId: string, limit = 20) {
  const orders = await prisma.purchaseOrder.findMany({
    where: {
      organizationId,
      status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"] },
      paymentStatus: { in: ["UNPAID", "PARTIAL"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { supplier: { select: { name: true, code: true } } },
  });
  return orders.map((order) => ({ ...order, balance: order.grandTotal.minus(order.paidAmount) }));
}

export async function dashboardData(organizationId: string) {
  const [sales, purchases, lowStock, stockValueTotal, trend, lowStockItems, recentOrders] = await Promise.all([
    salesSummary(organizationId),
    purchaseSummary(organizationId),
    lowStockCount(organizationId),
    stockValue(organizationId),
    salesTrend(organizationId, 7),
    listLowStock(organizationId, 8),
    prisma.salesOrder.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: { select: { name: true } } },
    }),
  ]);

  return { sales, purchases, lowStock, stockValue: stockValueTotal, trend, lowStockItems, recentOrders };
}

export async function recentPayments(organizationId: string, limit = 20) {
  return prisma.payment.findMany({
    where: { organizationId },
    orderBy: { paidAt: "desc" },
    take: limit,
    include: { createdBy: { select: { name: true } } },
  });
}