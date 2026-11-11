import { NextResponse } from "next/server";

import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { getSession, organizationIdOf, roleOf } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!can(roleOf(session), "inventory.read")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let organizationId: string;
  try {
    organizationId = organizationIdOf(session);
  } catch {
    return new NextResponse("Organization is not configured", { status: 400 });
  }

  const levels = await prisma.stockLevel.findMany({
    where: { organizationId },
    orderBy: [{ warehouse: { name: "asc" } }, { variant: { sku: "asc" } }],
    include: {
      warehouse: true,
      location: true,
      variant: { include: { product: true } },
    },
  });

  const rows: Array<Array<string | number>> = [
    [
      "warehouseCode",
      "warehouseName",
      "locationCode",
      "sku",
      "productName",
      "variantName",
      "quantity",
      "reservedQuantity",
      "available",
      "reorderPoint",
    ],
  ];

  for (const level of levels) {
    rows.push([
      level.warehouse.code,
      level.warehouse.name,
      level.location.code,
      level.variant.sku,
      level.variant.product.name,
      level.variant.name,
      level.quantity.toString(),
      level.reservedQuantity.toString(),
      level.quantity.minus(level.reservedQuantity).toString(),
      level.variant.reorderPoint.toString(),
    ]);
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}