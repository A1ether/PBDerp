import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { dec, lineAmount, sum, taxAmount } from "@/lib/money";
import { nextDocumentNo } from "@/lib/sequence";
import { prisma } from "@/lib/db";
import {
  createStockMovement,
  getDefaultLocation,
  lockStockLevel,
} from "@/modules/inventory/service";
import type { CreateSalesOrderInput, RecordPaymentInput } from "@/modules/sales/schema";

type ActorContext = { organizationId: string; actorId: string };

export async function createSalesOrder(input: CreateSalesOrderInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const [customer, warehouse, variants] = await Promise.all([
      tx.customer.findFirst({ where: { id: input.customerId, organizationId: ctx.organizationId, status: "ACTIVE" } }),
      tx.warehouse.findFirst({ where: { id: input.warehouseId, organizationId: ctx.organizationId, status: "ACTIVE" } }),
      tx.productVariant.findMany({
        where: { id: { in: input.lines.map((line) => line.variantId) }, organizationId: ctx.organizationId },
        include: { product: { select: { name: true } } },
      }),
    ]);

    if (!customer) throw new AppError("NOT_FOUND", "客户不存在或已停用。");
    if (!warehouse) throw new AppError("NOT_FOUND", "发货仓库不存在或已停用。");
    if (variants.length !== new Set(input.lines.map((line) => line.variantId)).size) {
      throw new AppError("VALIDATION_ERROR", "订单中存在无效 SKU。");
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    let subtotal = sum([]);
    let discountTotal = sum([]);
    let taxTotal = sum([]);

    const lines = input.lines.map((line) => {
      const variant = variantMap.get(line.variantId);
      if (!variant) throw new AppError("VALIDATION_ERROR", "订单中存在无效 SKU。");
      if (variant.status !== "ACTIVE") throw new AppError("VALIDATION_ERROR", `SKU ${variant.sku} 已停用。`);

      const quantity = dec(line.quantity);
      const unitPrice = dec(line.unitPrice || variant.salePrice);
      const discount = dec(line.discount);
      const taxRate = dec(line.taxRate);
      const lineTotal = lineAmount(quantity, unitPrice, discount);
      const tax = taxAmount(lineTotal, taxRate);

      subtotal = subtotal.plus(lineTotal);
      discountTotal = discountTotal.plus(discount);
      taxTotal = taxTotal.plus(tax);

      return {
        organizationId: ctx.organizationId,
        variantId: variant.id,
        skuSnapshot: variant.sku,
        nameSnapshot: `${variant.product.name} · ${variant.name}`,
        quantity,
        unitPrice,
        discount,
        taxRate,
        lineTotal,
      };
    });

    const grandTotal = subtotal.minus(discountTotal).plus(taxTotal);
    const orderNo = await nextDocumentNo(tx, ctx.organizationId, "SALES_ORDER");
    const orderedAt = input.orderedAt ? new Date(input.orderedAt) : new Date();

    const order = await tx.salesOrder.create({
      data: {
        organizationId: ctx.organizationId,
        orderNo,
        customerId: customer.id,
        warehouseId: warehouse.id,
        status: "DRAFT",
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        orderedAt: Number.isNaN(orderedAt.getTime()) ? new Date() : orderedAt,
        note: input.note || null,
        createdById: ctx.actorId,
        lines: { create: lines },
      },
      include: { lines: true },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.order.create",
      entityType: "SalesOrder",
      entityId: order.id,
      after: auditJson(order),
    });

    return order;
  });
}

async function lockOrder(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"::text AS "status"
    FROM "SalesOrder"
    WHERE "id" = ${id} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
  if (rows.length === 0) throw new AppError("NOT_FOUND", "销售订单不存在。");
  return rows[0];
}

export async function confirmSalesOrder(id: string, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (locked.status !== "DRAFT") {
      throw new AppError("INVALID_STATE", "只有草稿订单可以确认。");
    }

    const order = await tx.salesOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { lines: { include: { variant: true } } },
    });
    if (!order) throw new AppError("NOT_FOUND", "销售订单不存在。");
    if (order.lines.length === 0) throw new AppError("VALIDATION_ERROR", "订单没有商品行。");

    const location = await getDefaultLocation(tx, order.warehouseId);

    for (const line of order.lines) {
      const level = await lockStockLevel(tx, {
        organizationId: ctx.organizationId,
        warehouseId: order.warehouseId,
        locationId: location.id,
        variantId: line.variantId,
      });

      const available = level.quantity.minus(level.reservedQuantity);
      if (available.lt(line.quantity)) {
        throw new AppError(
          "INSUFFICIENT_STOCK",
          `SKU ${line.skuSnapshot} 可用库存不足：需要 ${line.quantity.toString()}，可用 ${available.toString()}。`,
        );
      }

      await tx.stockLevel.update({
        where: { id: level.id },
        data: { reservedQuantity: level.reservedQuantity.plus(line.quantity) },
      });

      await tx.stockReservation.create({
        data: {
          organizationId: ctx.organizationId,
          salesOrderLineId: line.id,
          warehouseId: order.warehouseId,
          locationId: location.id,
          variantId: line.variantId,
          quantity: line.quantity,
          status: "ACTIVE",
        },
      });
    }

    const updated = await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.order.confirm",
      entityType: "SalesOrder",
      entityId: order.id,
      before: auditJson({ status: order.status }),
      after: auditJson({ status: updated.status, orderNo: order.orderNo }),
    });

    return updated;
  });
}

export type ShipLineInput = {
  lineId: string;
  quantity: string;
};

export async function shipSalesOrder(id: string, ctx: ActorContext) {
  return shipSalesOrderWithLines(id, [], ctx);
}

export async function shipSalesOrderWithLines(
  id: string,
  requestedLines: ShipLineInput[],
  ctx: ActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (locked.status !== "CONFIRMED" && locked.status !== "PARTIALLY_SHIPPED") {
      throw new AppError("INVALID_STATE", "只有已确认或部分出库的订单可以出库。");
    }

    const order = await tx.salesOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        lines: { include: { reservations: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!order) throw new AppError("NOT_FOUND", "销售订单不存在。");

    const requested =
      requestedLines.length > 0
        ? requestedLines
        : order.lines
            .map((line) => ({
              lineId: line.id,
              quantity: line.quantity.minus(line.shippedQuantity).toString(),
            }))
            .filter((line) => Number(line.quantity) > 0);

    if (requested.length === 0) {
      throw new AppError("VALIDATION_ERROR", "没有可出库的数量。");
    }
    if (new Set(requested.map((line) => line.lineId)).size !== requested.length) {
      throw new AppError("VALIDATION_ERROR", "同一商品行不能重复出库。");
    }

    const shipmentNo = await nextDocumentNo(tx, ctx.organizationId, "SHIPMENT");
    const shipment = await tx.shipment.create({
      data: {
        organizationId: ctx.organizationId,
        shipmentNo,
        orderId: order.id,
        warehouseId: order.warehouseId,
        status: "SHIPPED",
        shippedAt: new Date(),
      },
    });

    const lineMap = new Map(order.lines.map((line) => [line.id, line]));

    for (const request of requested) {
      const line = lineMap.get(request.lineId);
      if (!line) throw new AppError("VALIDATION_ERROR", "订单行不存在。");

      const shipQty = dec(request.quantity);
      if (!shipQty.isPositive()) {
        throw new AppError("VALIDATION_ERROR", "出库数量必须大于 0。");
      }

      const remaining = line.quantity.minus(line.shippedQuantity);
      if (shipQty.gt(remaining)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `SKU ${line.skuSnapshot} 出库数量超过剩余数量（剩余 ${remaining.toString()}）。`,
        );
      }

      const reservation = line.reservations[0];
      if (!reservation) {
        throw new AppError("RESERVATION_MISMATCH", `SKU ${line.skuSnapshot} 缺少有效预留，无法出库。`);
      }
      if (reservation.quantity.lt(shipQty)) {
        throw new AppError("RESERVATION_MISMATCH", `SKU ${line.skuSnapshot} 预留数量不足。`);
      }

      const level = await lockStockLevel(tx, {
        organizationId: ctx.organizationId,
        warehouseId: order.warehouseId,
        locationId: reservation.locationId,
        variantId: line.variantId,
      });

      if (level.reservedQuantity.lt(shipQty)) {
        throw new AppError("RESERVATION_MISMATCH", `SKU ${line.skuSnapshot} 预留数量异常，请检查库存。`);
      }
      if (level.quantity.lt(shipQty)) {
        throw new AppError("INSUFFICIENT_STOCK", `SKU ${line.skuSnapshot} 实物库存不足，无法出库。`);
      }

      const nextQuantity = level.quantity.minus(shipQty);
      const nextReserved = level.reservedQuantity.minus(shipQty);

      await tx.stockLevel.update({
        where: { id: level.id },
        data: { quantity: nextQuantity, reservedQuantity: nextReserved },
      });

      if (reservation.quantity.eq(shipQty)) {
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: "CONSUMED" },
        });
      } else {
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { quantity: reservation.quantity.minus(shipQty) },
        });
      }

      await tx.salesOrderLine.update({
        where: { id: line.id },
        data: { shippedQuantity: line.shippedQuantity.plus(shipQty) },
      });

      await tx.shipmentLine.create({
        data: {
          organizationId: ctx.organizationId,
          shipmentId: shipment.id,
          orderLineId: line.id,
          variantId: line.variantId,
          quantity: shipQty,
        },
      });

      await createStockMovement(tx, {
        organizationId: ctx.organizationId,
        warehouseId: order.warehouseId,
        locationId: reservation.locationId,
        variantId: line.variantId,
        type: "SALES_SHIPMENT",
        quantity: shipQty.negated(),
        unitCost: 0,
        balanceAfter: nextQuantity,
        referenceType: "SALES_ORDER",
        referenceId: order.id,
        note: `销售出库 ${shipmentNo}`,
        createdById: ctx.actorId,
      });
    }

    const refreshed = await tx.salesOrderLine.findMany({ where: { orderId: order.id } });
    const fullyShipped = refreshed.every((line) => line.shippedQuantity.gte(line.quantity));
    const nextStatus = fullyShipped ? "SHIPPED" : "PARTIALLY_SHIPPED";

    const updated = await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: nextStatus, shippedAt: new Date() },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.order.ship",
      entityType: "SalesOrder",
      entityId: order.id,
      before: auditJson({ status: order.status }),
      after: auditJson({ status: updated.status, shipmentNo, lines: requested.length }),
    });

    return updated;
  });
}

export async function cancelSalesOrder(id: string, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (locked.status !== "DRAFT" && locked.status !== "CONFIRMED") {
      throw new AppError("INVALID_STATE", "只有草稿或已确认订单可以取消。");
    }

    const order = await tx.salesOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: {
        lines: { include: { reservations: { where: { status: "ACTIVE" } } } },
      },
    });
    if (!order) throw new AppError("NOT_FOUND", "销售订单不存在。");

    if (order.status === "CONFIRMED") {
      for (const line of order.lines) {
        for (const reservation of line.reservations) {
          const level = await lockStockLevel(tx, {
            organizationId: ctx.organizationId,
            warehouseId: reservation.warehouseId,
            locationId: reservation.locationId,
            variantId: reservation.variantId,
          });
          if (level.reservedQuantity.lt(reservation.quantity)) {
            throw new AppError("RESERVATION_MISMATCH", "预留数量异常，无法释放。");
          }
          await tx.stockLevel.update({
            where: { id: level.id },
            data: { reservedQuantity: level.reservedQuantity.minus(reservation.quantity) },
          });
          await tx.stockReservation.update({
            where: { id: reservation.id },
            data: { status: "RELEASED" },
          });
        }
      }
    }

    const updated = await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.order.cancel",
      entityType: "SalesOrder",
      entityId: order.id,
      before: auditJson({ status: order.status }),
      after: auditJson({ status: updated.status }),
    });

    return updated;
  });
}

export async function completeSalesOrder(id: string, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (locked.status !== "SHIPPED") {
      throw new AppError("INVALID_STATE", "只有已出库订单可以完成。");
    }
    const updated = await tx.salesOrder.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.order.complete",
      entityType: "SalesOrder",
      entityId: id,
      before: auditJson({ status: locked.status }),
      after: auditJson({ status: updated.status }),
    });
    return updated;
  });
}

export async function recordSalesPayment(input: RecordPaymentInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, input.id, ctx.organizationId);
    if (locked.status === "CANCELLED") {
      throw new AppError("INVALID_STATE", "已取消订单不能收款。");
    }

    const order = await tx.salesOrder.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
    if (!order) throw new AppError("NOT_FOUND", "销售订单不存在。");

    const amount = dec(input.amount);
    const paidAmount = order.paidAmount.plus(amount);
    const paymentStatus = paidAmount.gte(order.grandTotal) ? "PAID" : paidAmount.gt(0) ? "PARTIAL" : "UNPAID";
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

    const payment = await tx.payment.create({
      data: {
        organizationId: ctx.organizationId,
        direction: "IN",
        referenceType: "SALES_ORDER",
        referenceId: order.id,
        amount,
        currency: order.currency,
        method: input.method,
        paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
        note: input.note || null,
        createdById: ctx.actorId,
      },
    });

    const updated = await tx.salesOrder.update({
      where: { id: order.id },
      data: { paidAmount, paymentStatus },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "sales.payment.create",
      entityType: "Payment",
      entityId: payment.id,
      after: auditJson({ orderId: order.id, amount: amount.toString(), paidAmount: paidAmount.toString(), paymentStatus }),
    });

    return updated;
  });
}