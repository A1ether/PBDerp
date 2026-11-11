import "server-only";

import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { dec } from "@/lib/money";
import { nextDocumentNo } from "@/lib/sequence";
import { prisma } from "@/lib/db";
import { createStockMovement, lockStockLevel } from "@/modules/inventory/service";

type ActorContext = { organizationId: string; actorId: string };

export async function createStockTake(
  input: { warehouseId: string; note?: string },
  ctx: ActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, organizationId: ctx.organizationId, status: "ACTIVE" },
    });
    if (!warehouse) throw new AppError("NOT_FOUND", "仓库不存在或已停用。");

    const levels = await tx.stockLevel.findMany({
      where: { organizationId: ctx.organizationId, warehouseId: warehouse.id },
      include: { variant: { select: { sku: true } }, location: { select: { code: true } } },
    });
    if (levels.length === 0) {
      throw new AppError("INVALID_STATE", "该仓库暂无库存记录，无法创建盘点单。");
    }

    const takeNo = await nextDocumentNo(tx, ctx.organizationId, "STOCK_TAKE");
    const stockTake = await tx.stockTake.create({
      data: {
        organizationId: ctx.organizationId,
        takeNo,
        warehouseId: warehouse.id,
        status: "DRAFT",
        note: input.note || null,
        createdById: ctx.actorId,
        lines: {
          create: levels.map((level) => ({
            organizationId: ctx.organizationId,
            variantId: level.variantId,
            locationId: level.locationId,
            systemQuantity: level.quantity,
            countedQuantity: level.quantity,
            difference: 0,
          })),
        },
      },
      include: { lines: true },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "inventory.stocktake.create",
      entityType: "StockTake",
      entityId: stockTake.id,
      after: auditJson({ takeNo, warehouseId: warehouse.id, lines: levels.length }),
    });

    return stockTake;
  });
}

export async function completeStockTake(
  id: string,
  counts: Record<string, string>,
  ctx: ActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status"::text AS "status"
      FROM "StockTake"
      WHERE "id" = ${id} AND "organizationId" = ${ctx.organizationId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new AppError("NOT_FOUND", "盘点单不存在。");
    if (rows[0].status !== "DRAFT") throw new AppError("INVALID_STATE", "只有草稿盘点单可以完成。");

    const stockTake = await tx.stockTake.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { lines: true },
    });
    if (!stockTake) throw new AppError("NOT_FOUND", "盘点单不存在。");

    for (const line of stockTake.lines) {
      const rawCount = counts[line.id];
      const counted = rawCount === undefined || rawCount === "" ? line.systemQuantity : dec(rawCount);
      if (counted.isNegative()) {
        throw new AppError("VALIDATION_ERROR", "实盘数量不能为负数。");
      }

      const level = await lockStockLevel(tx, {
        organizationId: ctx.organizationId,
        warehouseId: stockTake.warehouseId,
        locationId: line.locationId,
        variantId: line.variantId,
      });

      if (counted.lt(level.reservedQuantity)) {
        throw new AppError("INVALID_STATE", "实盘数量不能低于已预留数量，请先处理相关销售订单。");
      }

      const delta = counted.minus(level.quantity);
      if (!delta.isZero()) {
        await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: counted } });
        await createStockMovement(tx, {
          organizationId: ctx.organizationId,
          warehouseId: stockTake.warehouseId,
          locationId: line.locationId,
          variantId: line.variantId,
          type: "ADJUSTMENT",
          quantity: delta,
          balanceAfter: counted,
          referenceType: "STOCK_TAKE",
          referenceId: stockTake.id,
          note: `盘点调整 ${stockTake.takeNo}`,
          createdById: ctx.actorId,
        });
      }

      await tx.stockTakeLine.update({
        where: { id: line.id },
        data: {
          countedQuantity: counted,
          difference: counted.minus(line.systemQuantity),
        },
      });
    }

    const updated = await tx.stockTake.update({
      where: { id: stockTake.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "inventory.stocktake.complete",
      entityType: "StockTake",
      entityId: stockTake.id,
      before: auditJson({ status: stockTake.status }),
      after: auditJson({ status: updated.status, takeNo: stockTake.takeNo }),
    });

    return updated;
  });
}