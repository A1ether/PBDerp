import { NextResponse } from "next/server";

import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getSession, organizationIdOf, roleOf } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(roleOf(session), "sales.read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let organizationId: string;
  try {
    organizationId = organizationIdOf(session);
  } catch {
    return new NextResponse("Organization is not configured", { status: 400 });
  }

  const orders = await prisma.salesOrder.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, warehouse: true, lines: true },
  });

  const rows: Array<Array<string | number>> = [
    [
      "orderNo",
      "status",
      "paymentStatus",
      "customerCode",
      "customerName",
      "warehouse",
      "orderedAt",
      "grandTotal",
      "paidAmount",
      "sku",
      "productName",
      "quantity",
      "unitPrice",
      "lineTotal",
      "shippedQuantity",
      "returnedQuantity",
    ],
  ];

  for (const order of orders) {
    for (const line of order.lines) {
      rows.push([
        order.orderNo,
        order.status,
        order.paymentStatus,
        order.customer.code,
        order.customer.name,
        order.warehouse.name,
        order.orderedAt.toISOString(),
        order.grandTotal.toString(),
        order.paidAmount.toString(),
        line.skuSnapshot,
        line.nameSnapshot,
        line.quantity.toString(),
        line.unitPrice.toString(),
        line.lineTotal.toString(),
        line.shippedQuantity.toString(),
        line.returnedQuantity.toString(),
      ]);
    }
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-orders-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}