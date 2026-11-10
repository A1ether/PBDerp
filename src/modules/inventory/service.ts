import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma, type StockMovementType } from "@/generated/prisma/client";
import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { dec, sum } from "@/lib/money";
import { nextDocumentNo } from "@/lib/sequence";
import type { AdjustStockInput, TransferStockInput } from "@/modules/inventory/schema";

type ActorContext = { organizationId: string; actorId: string };

export type LockedStockLevel = {
  id: string;
  quantity: Prisma.Decimal;
  reservedQuantity: Prisma.Decimal;
};

type StockKey = {
  organizationId: string;
  warehouseId: string;
  locationId: string;
  variantId: string;
};

/**
 * Locks (or creates) the stock level row for a warehouse/location/variant.
 * Must be called inside a transaction. The row lock serializes concurrent stock changes.
 */
export async function lockStockLevel(
  tx: Prisma.TransactionClient,
  key: StockKey,
): Promise<LockedStockLevel> {
  const select = async () =>
    tx.$queryRaw<Array<{ id: string; quantity: string; reservedQuantity: string }>>`
      SELECT "id", "quantity"::text AS "quantity", "reservedQuantity"::text AS "reservedQuantity"
      FROM "StockLevel"
      WHERE "organizationId" = ${key.organizationId}
        AND "warehouseId" = ${key.warehouseId}
        AND "locationId" = ${key.locationId}
        AND "variantId" = ${key.variantId}
      FOR UPDATE
    `;

  let rows = await select();

  if (rows.length === 0) {
    await tx.$executeRaw`
      INSERT INTO "StockLevel"
        ("id", "organizationId", "warehouseId", "locationId", "variantId", "quantity", "reservedQuantity", "createdAt", "updatedAt")
      VALUES
        (${randomUUID()}, ${key.organizationId}, ${key.warehouseId}, ${key.locationId}, ${key.variantId}, 0, 0, now(), now())
      ON CONFLICT ("warehouseId", "locationId", "variantId") DO NOTHING
    `;
    rows = await select();
  }

  const row = rows[0];
  if (!row) throw new AppError("DATABASE_ERROR", "无法锁定库存记录。");

  return {
    id: row.id,
    quantity: dec(row.quantity),
    reservedQuantity: dec(row.reservedQuantity),
  };
}

export async function getDefaultLocation(tx: Prisma.TransactionClient, warehouseId: string) {
  const location = await tx.warehouseLocation.findFirst({
    where: { warehouseId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!location) {
    throw new AppError("INVALID_STATE", "仓库没有可用库位，请先在仓库详情中添加库位。");
  }
  return location;
}

type MovementInput = {
  organizationId: string;
  warehouseId: string;
  locationId: string;
  variantId: string;
  type: StockMovementType;
  quantity: Prisma.Decimal;
  unitCost?: Prisma.Decimal | string | number;
  balanceAfter: Prisma.Decimal;
  referenceType?: string;
  referenceId?: string;
  note?: string | null;
  createdById?: string | null;
};

export async function createStockMovement(tx: Prisma.TransactionClient, input: MovementInput) {
  return tx.stockMovement.create({
    data: {
      organizationId: input.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      variantId: input.variantId,
      type: input.type,
      quantity: input.quantity,
      unitCost: input.unitCost ?? 0,
      balanceAfter: input.balanceAfter,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      note: input.note,
      createdById: input.createdById,
    },
  });
}

export async function adjustStock(input: AdjustStockInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: { id: input.variantId, organizationId: ctx.organizationId },
      include: { product: { select: { name: true } } },
    });
    if (!variant) throw new AppError("NOT_FOUND", "SKU 不存在。");

    const location = await tx.warehouseLocation.findFirst({
      where: { id: input.locationId, organizationId: ctx.organizationId, warehouseId: input.warehouseId },
    });
    if (!location) throw new AppError("NOT_FOUND", "库位不属于所选仓库。");

    const level = await lockStockLevel(tx, {
      organizationId: ctx.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      variantId: input.variantId,
    });

    const requested = dec(input.quantity);
    let delta: Prisma.Decimal;
    let nextQuantity: Prisma.Decimal;

    if (input.mode === "IN") {
      delta = requested;
      nextQuantity = level.quantity.plus(requested);
    } else if (input.mode === "OUT") {
      delta = requested.negated();
      nextQuantity = level.quantity.minus(requested);
    } else {
      nextQuantity = requested;
      delta = requested.minus(level.quantity);
    }

    if (nextQuantity.isNegative()) {
      throw new AppError("INSUFFICIENT_STOCK", "出库后库存不能为负数。");
    }
    if (nextQuantity.lt(level.reservedQuantity)) {
      throw new AppError("INVALID_STATE", "调整后库存不能低于已预留数量，请先处理相关销售订单。");
    }
    if (delta.isZero()) {
      throw new AppError("INVALID_STATE", "库存数量没有变化。");
    }

    await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: nextQuantity } });

    const movement = await createStockMovement(tx, {
      organizationId: ctx.organizationId,
      warehouseId: input.warehouseId,
      locationId: input.locationId,
      variantId: input.variantId,
      type: "ADJUSTMENT",
      quantity: delta,
      unitCost: input.unitCost,
      balanceAfter: nextQuantity,
      referenceType: "MANUAL",
      note: input.note || null,
      createdById: ctx.actorId,
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "inventory.adjust",
      entityType: "StockLevel",
      entityId: level.id,
      before: auditJson({ quantity: level.quantity.toString(), reserved: level.reservedQuantity.toString() }),
      after: auditJson({
        quantity: nextQuantity.toString(),
        delta: delta.toString(),
        mode: input.mode,
        sku: variant.sku,
        movementId: movement.id,
      }),
    });

    return movement;
  });
}

export async function transferStock(input: TransferStockInput, ctx: ActorContext) {
  if (input.fromLocationId === input.toLocationId) {
    throw new AppError("VALIDATION_ERROR", "调出与调入库位不能相同。");
  }

  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({
      where: { id: input.variantId, organizationId: ctx.organizationId },
    });
    if (!variant) throw new AppError("NOT_FOUND", "SKU 不存在。");

    const locations = await tx.warehouseLocation.findMany({
      where: {
        id: { in: [input.fromLocationId, input.toLocationId] },
        organizationId: ctx.organizationId,
      },
    });
    const fromLocation = locations.find((item) => item.id === input.fromLocationId);
    const toLocation = locations.find((item) => item.id === input.toLocationId);
    if (!fromLocation || !toLocation) throw new AppError("NOT_FOUND", "库位不存在。");
    if (fromLocation.warehouseId !== input.fromWarehouseId || toLocation.warehouseId !== input.toWarehouseId) {
      throw new AppError("VALIDATION_ERROR", "库位与仓库不匹配。");
    }

    const fromKey = {
      organizationId: ctx.organizationId,
      warehouseId: input.fromWarehouseId,
      locationId: input.fromLocationId,
      variantId: input.variantId,
    };
    const toKey = {
      organizationId: ctx.organizationId,
      warehouseId: input.toWarehouseId,
      locationId: input.toLocationId,
      variantId: input.variantId,
    };

    // Deterministic lock order prevents deadlocks when two transfers run in opposite directions.
    const fromFirst = `${fromKey.warehouseId}:${fromKey.locationId}` < `${toKey.warehouseId}:${toKey.locationId}`;
    const fromLevel = await lockStockLevel(tx, fromFirst ? fromKey : toKey);
    const toLevel = await lockStockLevel(tx, fromFirst ? toKey : fromKey);

    const source = fromFirst ? fromLevel : toLevel;
    const destination = fromFirst ? toLevel : fromLevel;
    const transferQty = dec(input.quantity);

    if (source.quantity.minus(source.reservedQuantity).lt(transferQty)) {
      throw new AppError("INSUFFICIENT_STOCK", "调出仓可用库存不足。");
    }

    const fromNext = source.quantity.minus(transferQty);
    const toNext = destination.quantity.plus(transferQty);

    await tx.stockLevel.update({ where: { id: source.id }, data: { quantity: fromNext } });
    await tx.stockLevel.update({ where: { id: destination.id }, data: { quantity: toNext } });

    const docNo = await nextDocumentNo(tx, ctx.organizationId, "STOCK_TRANSFER");
    const transfer = await tx.stockTransfer.create({
      data: {
        organizationId: ctx.organizationId,
        transferNo: docNo,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        status: "COMPLETED",
        note: input.note || null,
        completedAt: new Date(),
        createdById: ctx.actorId,
        lines: {
          create: {
            organizationId: ctx.organizationId,
            variantId: input.variantId,
            quantity: transferQty,
          },
        },
      },
    });

    await createStockMovement(tx, {
      ...fromKey,
      type: "TRANSFER_OUT",
      quantity: transferQty.negated(),
      balanceAfter: fromNext,
      referenceType: "STOCK_TRANSFER",
      referenceId: transfer.id,
      note: input.note || null,
      createdById: ctx.actorId,
    });
    await createStockMovement(tx, {
      ...toKey,
      type: "TRANSFER_IN",
      quantity: transferQty,
      balanceAfter: toNext,
      referenceType: "STOCK_TRANSFER",
      referenceId: transfer.id,
      note: input.note || null,
      createdById: ctx.actorId,
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "inventory.transfer",
      entityType: "StockTransfer",
      entityId: transfer.id,
      after: auditJson({
        transferNo: docNo,
        sku: variant.sku,
        from: fromKey,
        to: toKey,
        quantity: transferQty.toString(),
      }),
    });

    return transfer;
  });
}

export async function lowStockCount(organizationId: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "StockLevel" sl
    JOIN "ProductVariant" pv ON pv."id" = sl."variantId"
    WHERE sl."organizationId" = ${organizationId}
      AND pv."status" = 'ACTIVE'
      AND pv."reorderPoint" > 0
      AND (sl."quantity" - sl."reservedQuantity") <= pv."reorderPoint"
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function stockValue(organizationId: string) {
  const levels = await prisma.stockLevel.findMany({
    where: { organizationId },
    select: {
      quantity: true,
      variant: { select: { purchasePrice: true } },
    },
  });
  return sum(levels.map((level) => level.quantity.times(level.variant.purchasePrice)));
}