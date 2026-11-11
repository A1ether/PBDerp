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
import type { CreatePurchaseOrderInput, RecordSupplierPaymentInput } from "@/modules/purchases/schema";

type ActorContext = { organizationId: string; actorId: string };

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const [supplier, warehouse, variants] = await Promise.all([
      tx.supplier.findFirst({ where: { id: input.supplierId, organizationId: ctx.organizationId, status: "ACTIVE" } }),
      tx.warehouse.findFirst({ where: { id: input.warehouseId, organizationId: ctx.organizationId, status: "ACTIVE" } }),
      tx.productVariant.findMany({
        where: { id: { in: input.lines.map((line) => line.variantId) }, organizationId: ctx.organizationId },
        include: { product: { select: { name: true } } },
      }),
    ]);

    if (!supplier) throw new AppError("NOT_FOUND", "供应商不存在或已停用。");
    if (!warehouse) throw new AppError("NOT_FOUND", "收货仓库不存在或已停用。");
    if (variants.length !== new Set(input.lines.map((line) => line.variantId)).size) {
      throw new AppError("VALIDATION_ERROR", "订单中存在无效 SKU。");
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    let subtotal = sum([]);
    let taxTotal = sum([]);

    const lines = input.lines.map((line) => {
      const variant = variantMap.get(line.variantId);
      if (!variant) throw new AppError("VALIDATION_ERROR", "订单中存在无效 SKU。");
      if (variant.status !== "ACTIVE") throw new AppError("VALIDATION_ERROR", `SKU ${variant.sku} 已停用。`);

      const quantity = dec(line.quantity);
      const unitCost = dec(line.unitCost);
      const taxRate = dec(line.taxRate);
      const lineTotal = lineAmount(quantity, unitCost, 0);
      const tax = taxAmount(lineTotal, taxRate);

      subtotal = subtotal.plus(lineTotal);
      taxTotal = taxTotal.plus(tax);

      return {
        organizationId: ctx.organizationId,
        variantId: variant.id,
        skuSnapshot: variant.sku,
        nameSnapshot: `${variant.product.name} · ${variant.name}`,
        quantity,
        unitCost,
        taxRate,
        lineTotal,
      };
    });

    const grandTotal = subtotal.plus(taxTotal);
    const orderNo = await nextDocumentNo(tx, ctx.organizationId, "PURCHASE_ORDER");
    const expectedAt = input.expectedAt ? new Date(input.expectedAt) : null;

    const order = await tx.purchaseOrder.create({
      data: {
        organizationId: ctx.organizationId,
        orderNo,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: "DRAFT",
        subtotal,
        taxTotal,
        grandTotal,
        expectedAt: expectedAt && !Number.isNaN(expectedAt.getTime()) ? expectedAt : null,
        note: input.note || null,
        createdById: ctx.actorId,
        lines: { create: lines },
      },
      include: { lines: true },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "purchase.order.create",
      entityType: "PurchaseOrder",
      entityId: order.id,
      after: auditJson(order),
    });

    return order;
  });
}

async function lockOrder(tx: Prisma.TransactionClient, id: string, organizationId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
    SELECT "id", "status"::text AS "status"
    FROM "PurchaseOrder"
    WHERE "id" = ${id} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
  if (rows.length === 0) throw new AppError("NOT_FOUND", "采购订单不存在。");
  return rows[0];
}

async function transition(
  id: string,
  ctx: ActorContext,
  allowed: string[],
  nextStatus: "APPROVED" | "ORDERED" | "CANCELLED",
  action: string,
  data?: { approvedAt?: Date; receivedAt?: Date },
) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (!allowed.includes(locked.status)) {
      throw new AppError("INVALID_STATE", "当前状态不允许执行该操作。");
    }
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: nextStatus, ...data },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action,
      entityType: "PurchaseOrder",
      entityId: id,
      before: auditJson({ status: locked.status }),
      after: auditJson({ status: updated.status }),
    });
    return updated;
  });
}

export async function approvePurchaseOrder(id: string, ctx: ActorContext) {
  return transition(id, ctx, ["DRAFT"], "APPROVED", "purchase.order.approve", { approvedAt: new Date() });
}

export async function markPurchaseOrderOrdered(id: string, ctx: ActorContext) {
  return transition(id, ctx, ["APPROVED"], "ORDERED", "purchase.order.order");
}

export async function cancelPurchaseOrder(id: string, ctx: ActorContext) {
  return transition(
    id,
    ctx,
    ["DRAFT", "APPROVED", "ORDERED"],
    "CANCELLED",
    "purchase.order.cancel",
  );
}

export type ReceiveLineInput = {
  lineId: string;
  quantity: string;
};

export async function receivePurchaseOrder(id: string, ctx: ActorContext) {
  return receivePurchaseOrderWithLines(id, [], ctx);
}

export async function receivePurchaseOrderWithLines(
  id: string,
  requestedLines: ReceiveLineInput[],
  ctx: ActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, id, ctx.organizationId);
    if (!["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"].includes(locked.status)) {
      throw new AppError("INVALID_STATE", "当前状态不允许收货。");
    }

    const order = await tx.purchaseOrder.findFirst({
      where: { id, organizationId: ctx.organizationId },
      include: { lines: true },
    });
    if (!order) throw new AppError("NOT_FOUND", "采购订单不存在。");

    const requested =
      requestedLines.length > 0
        ? requestedLines
        : order.lines
            .map((line) => ({
              lineId: line.id,
              quantity: line.quantity.minus(line.receivedQuantity).toString(),
            }))
            .filter((line) => Number(line.quantity) > 0);

    if (requested.length === 0) {
      throw new AppError("VALIDATION_ERROR", "没有可收货的数量。");
    }
    if (new Set(requested.map((line) => line.lineId)).size !== requested.length) {
      throw new AppError("VALIDATION_ERROR", "同一商品行不能重复收货。");
    }

    const location = await getDefaultLocation(tx, order.warehouseId);
    const receiptNo = await nextDocumentNo(tx, ctx.organizationId, "GOODS_RECEIPT");
    const receipt = await tx.goodsReceipt.create({
      data: {
        organizationId: ctx.organizationId,
        receiptNo,
        orderId: order.id,
        warehouseId: order.warehouseId,
        status: "RECEIVED",
        receivedAt: new Date(),
      },
    });

    const lineMap = new Map(order.lines.map((line) => [line.id, line]));

    for (const request of requested) {
      const line = lineMap.get(request.lineId);
      if (!line) throw new AppError("VALIDATION_ERROR", "采购订单行不存在。");

      const receiveQty = dec(request.quantity);
      if (!receiveQty.isPositive()) {
        throw new AppError("VALIDATION_ERROR", "收货数量必须大于 0。");
      }
      const remaining = line.quantity.minus(line.receivedQuantity);
      if (receiveQty.gt(remaining)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `SKU ${line.skuSnapshot} 收货数量超过剩余数量（剩余 ${remaining.toString()}）。`,
        );
      }

      const level = await lockStockLevel(tx, {
        organizationId: ctx.organizationId,
        warehouseId: order.warehouseId,
        locationId: location.id,
        variantId: line.variantId,
      });

      const nextQuantity = level.quantity.plus(receiveQty);
      await tx.stockLevel.update({ where: { id: level.id }, data: { quantity: nextQuantity } });

      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQuantity: line.receivedQuantity.plus(receiveQty) },
      });

      await tx.goodsReceiptLine.create({
        data: {
          organizationId: ctx.organizationId,
          receiptId: receipt.id,
          orderLineId: line.id,
          variantId: line.variantId,
          quantity: receiveQty,
          unitCost: line.unitCost,
        },
      });

      await createStockMovement(tx, {
        organizationId: ctx.organizationId,
        warehouseId: order.warehouseId,
        locationId: location.id,
        variantId: line.variantId,
        type: "PURCHASE_RECEIPT",
        quantity: receiveQty,
        unitCost: line.unitCost,
        balanceAfter: nextQuantity,
        referenceType: "PURCHASE_ORDER",
        referenceId: order.id,
        note: `采购收货 ${receiptNo}`,
        createdById: ctx.actorId,
      });
    }

    const refreshed = await tx.purchaseOrderLine.findMany({ where: { orderId: order.id } });
    const fullyReceived = refreshed.every((line) => line.receivedQuantity.gte(line.quantity));

    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
        receivedAt: fullyReceived ? new Date() : order.receivedAt,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "purchase.order.receive",
      entityType: "PurchaseOrder",
      entityId: order.id,
      before: auditJson({ status: order.status }),
      after: auditJson({ status: updated.status, receiptNo, lines: requested.length }),
    });

    return updated;
  });
}

export async function recordSupplierPayment(input: RecordSupplierPaymentInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, input.id, ctx.organizationId);
    if (locked.status === "CANCELLED") {
      throw new AppError("INVALID_STATE", "已取消订单不能付款。");
    }

    const order = await tx.purchaseOrder.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
    if (!order) throw new AppError("NOT_FOUND", "采购订单不存在。");

    const amount = dec(input.amount);
    const paidAmount = order.paidAmount.plus(amount);
    const paymentStatus = paidAmount.gte(order.grandTotal) ? "PAID" : paidAmount.gt(0) ? "PARTIAL" : "UNPAID";
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();

    const payment = await tx.payment.create({
      data: {
        organizationId: ctx.organizationId,
        direction: "OUT",
        referenceType: "PURCHASE_ORDER",
        referenceId: order.id,
        amount,
        currency: order.currency,
        method: input.method,
        paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt,
        note: input.note || null,
        createdById: ctx.actorId,
      },
    });

    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { paidAmount, paymentStatus },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "purchase.payment.create",
      entityType: "Payment",
      entityId: payment.id,
      after: auditJson({ orderId: order.id, amount: amount.toString(), paidAmount: paidAmount.toString(), paymentStatus }),
    });

    return updated;
  });
}