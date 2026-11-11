import "server-only";

import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { dec, lineAmount, sum } from "@/lib/money";
import { nextDocumentNo } from "@/lib/sequence";
import { prisma } from "@/lib/db";
import { createStockMovement, getDefaultLocation, lockStockLevel } from "@/modules/inventory/service";

type ActorContext = { organizationId: string; actorId: string };

export type SalesReturnLineInput = {
  orderLineId: string;
  quantity: string;
};

export async function createSalesReturn(
  orderId: string,
  reason: string,
  requestedLines: SalesReturnLineInput[],
  ctx: ActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId },
      include: { lines: true },
    });
    if (!order) throw new AppError("NOT_FOUND", "销售订单不存在。");
    if (!["SHIPPED", "COMPLETED", "PARTIALLY_SHIPPED"].includes(order.status)) {
      throw new AppError("INVALID_STATE", "只有已出库或已完成的订单可以退货。");
    }

    if (requestedLines.length === 0) {
      throw new AppError("VALIDATION_ERROR", "请填写至少一行退货数量。");
    }
    if (new Set(requestedLines.map((line) => line.orderLineId)).size !== requestedLines.length) {
      throw new AppError("VALIDATION_ERROR", "同一商品行不能重复退货。");
    }

    const lineMap = new Map(order.lines.map((line) => [line.id, line]));
    let refundAmount = sum([]);

    const lines = requestedLines.map((request) => {
      const line = lineMap.get(request.orderLineId);
      if (!line) throw new AppError("VALIDATION_ERROR", "订单行不存在。");

      const quantity = dec(request.quantity);
      if (!quantity.isPositive()) {
        throw new AppError("VALIDATION_ERROR", "退货数量必须大于 0。");
      }

      const returnable = line.shippedQuantity.minus(line.returnedQuantity);
      if (quantity.gt(returnable)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `SKU ${line.skuSnapshot} 退货数量超过可退数量（可退 ${returnable.toString()}）。`,
        );
      }

      const lineTotal = lineAmount(quantity, line.unitPrice, 0);
      refundAmount = refundAmount.plus(lineTotal);

      return {
        organizationId: ctx.organizationId,
        orderLineId: line.id,
        variantId: line.variantId,
        quantity,
        unitPrice: line.unitPrice,
        lineTotal,
      };
    });

    const returnNo = await nextDocumentNo(tx, ctx.organizationId, "SALES_RETURN");

    const salesReturn = await tx.salesReturn.create({
      data: {
        organizationId: ctx.organizationId,
        returnNo,
        orderId: order.id,
        warehouseId: order.warehouseId,
        status: "DRAFT",
        reason: reason || null,
        refundAmount,
        createdById: ctx.actorId,
        lines: { create: lines },
      },
      include: { lines: true },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.return.create",
      entityType: "SalesReturn",
      entityId: salesReturn.id,
      after: auditJson(salesReturn),
    });

    return salesReturn;
  });
}

export async function receiveSalesReturn(id: string, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status"::text AS "status"
      FROM "SalesReturn"
      WHERE "id" = ${id} AND "organizationId" = ${ctx.organizationId}
      FOR UPDATE
    `;
    if (rows.length === 0) throw new AppError("NOT_FOUND", "退货单不存在。");
    if (rows[0].status !== "DRAFT") {
      throw new AppError("INVALID_STATE", "只有草稿退货单可以入库。");
    }

    const salesReturn = await tx.salesReturn.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { order: true, lines: { include: { orderLine: true } } },
    });
    if (!salesReturn) throw new AppError("NOT_FOUND", "退货单不存在。");

    const location = await getDefaultLocation(tx, salesReturn.warehouseId);

    for (const line of salesReturn.lines) {
      const level = await lockStockLevel(tx, {
        organizationId: ctx.organizationId,
        warehouseId: salesReturn.warehouseId,
        locationId: location.id,
        variantId: line.variantId,
      });
      const nextQuantity = level.quantity.plus(line.quantity);
      await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: nextQuantity } });

      await tx.salesOrderLine.update({
        where: { id: line.orderLineId },
        data: { returnedQuantity: line.orderLine.returnedQuantity.plus(line.quantity) },
      });

      await createStockMovement(tx, {
        organizationId: ctx.organizationId,
        warehouseId: salesReturn.warehouseId,
        locationId: location.id,
        variantId: line.variantId,
        type: "RETURN_IN",
        quantity: line.quantity,
        unitCost: line.unitPrice,
        balanceAfter: nextQuantity,
        referenceType: "SALES_RETURN",
        referenceId: salesReturn.id,
        note: `销售退货入库 ${salesReturn.returnNo}`,
        createdById: ctx.actorId,
      });
    }

    if (salesReturn.refundAmount.gt(0)) {
      await tx.payment.create({
        data: {
          organizationId: ctx.organizationId,
          direction: "OUT",
          referenceType: "SALES_RETURN",
          referenceId: salesReturn.id,
          amount: salesReturn.refundAmount,
          currency: salesReturn.order.currency,
          method: "OTHER",
          paidAt: new Date(),
          note: `销售退货退款 ${salesReturn.returnNo}`,
          createdById: ctx.actorId,
        },
      });
    }

    const updated = await tx.salesReturn.update({
      where: { id: salesReturn.id },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.return.receive",
      entityType: "SalesReturn",
      entityId: salesReturn.id,
      before: auditJson({ status: salesReturn.status }),
      after: auditJson({ status: updated.status, refundAmount: salesReturn.refundAmount.toString() }),
    });

    return updated;
  });
}