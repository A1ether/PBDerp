import "server-only";

import { randomUUID } from "node:crypto";

import { auditJson } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import { parseOrderCsv, type ExternalOrder } from "@/modules/channels/adapter";
import type { CreateChannelInput } from "@/modules/channels/schema";
import { createSalesOrder } from "@/modules/sales/service";

type ActorContext = { organizationId: string; actorId: string };

export async function createChannel(input: CreateChannelInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const channel = await tx.channel.create({
      data: {
        organizationId: ctx.organizationId,
        name: input.name,
        code: input.code,
        type: input.type,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorId: ctx.actorId,
        action: "channels.create",
        entityType: "Channel",
        entityId: channel.id,
        after: auditJson(channel),
      },
    });

    return channel;
  });
}

async function resolveCustomer(external: ExternalOrder, organizationId: string) {
  if (external.customerCode) {
    const byCode = await prisma.customer.findFirst({
      where: { organizationId, code: external.customerCode },
    });
    if (byCode) return byCode;
  }

  if (external.customerPhone) {
    const byPhone = await prisma.customer.findFirst({
      where: { organizationId, phone: external.customerPhone },
    });
    if (byPhone) return byPhone;
  }

  const byName = await prisma.customer.findFirst({
    where: { organizationId, name: external.customerName },
  });
  if (byName) return byName;

  return prisma.customer.create({
    data: {
      organizationId,
      code: external.customerCode || `C-${randomUUID().slice(0, 8).toUpperCase()}`,
      name: external.customerName,
      phone: external.customerPhone || null,
      status: "ACTIVE",
    },
  });
}

async function resolveWarehouse(external: ExternalOrder, organizationId: string) {
  if (external.warehouseCode) {
    const byCode = await prisma.warehouse.findFirst({
      where: { organizationId, code: external.warehouseCode, status: "ACTIVE" },
    });
    if (!byCode) throw new AppError("NOT_FOUND", `仓库编码 ${external.warehouseCode} 不存在。`);
    return byCode;
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { organizationId, status: "ACTIVE" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!warehouse) throw new AppError("NOT_FOUND", "没有可用仓库，无法导入订单。");
  return warehouse;
}

export async function importOrders(channelId: string, csv: string, ctx: ActorContext) {
  const channel = await prisma.channel.findFirst({
    where: { id: channelId, organizationId: ctx.organizationId, status: "ACTIVE" },
  });
  if (!channel) throw new AppError("NOT_FOUND", "渠道不存在或已停用。");

  const externalOrders = parseOrderCsv(csv);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const external of externalOrders) {
    const existing = await prisma.channelOrder.findUnique({
      where: {
        channelId_externalOrderNo: {
          channelId: channel.id,
          externalOrderNo: external.externalOrderNo,
        },
      },
    });
    if (existing) {
      skipped += 1;
      continue;
    }

    try {
      const customer = await resolveCustomer(external, ctx.organizationId);
      const warehouse = await resolveWarehouse(external, ctx.organizationId);
      const skus = [...new Set(external.lines.map((line) => line.variantId))];
      const variants = await prisma.productVariant.findMany({
        where: { organizationId: ctx.organizationId, sku: { in: skus } },
      });
      const variantMap = new Map(variants.map((variant) => [variant.sku, variant]));

      const lines = external.lines.map((line) => {
        const variant = variantMap.get(line.variantId);
        if (!variant) {
          throw new AppError("VALIDATION_ERROR", `SKU ${line.variantId} 不存在。`);
        }
        return {
          variantId: variant.id,
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice) > 0 ? line.unitPrice : variant.salePrice.toString(),
          discount: "0",
          taxRate: line.taxRate || "0",
        };
      });

      const salesOrder = await createSalesOrder(
        {
          customerId: customer.id,
          warehouseId: warehouse.id,
          orderedAt: external.orderedAt ?? "",
          note: external.note ?? `渠道导入 · ${channel.name}`,
          lines,
        },
        ctx,
      );

      await prisma.channelOrder.create({
        data: {
          organizationId: ctx.organizationId,
          channelId: channel.id,
          externalOrderNo: external.externalOrderNo,
          salesOrderId: salesOrder.id,
          rawPayload: external.raw,
          status: "IMPORTED",
          importedAt: new Date(),
        },
      });
      imported += 1;
    } catch (error) {
      failed += 1;
      await prisma.channelOrder
        .create({
          data: {
            organizationId: ctx.organizationId,
            channelId: channel.id,
            externalOrderNo: external.externalOrderNo,
            rawPayload: external.raw,
            status: "FAILED",
            errorMessage: error instanceof Error ? error.message : "导入失败",
          },
        })
        .catch(() => undefined);
    }
  }

  await prisma.channel.update({
    where: { id: channel.id },
    data: { lastSyncAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "channels.import",
      entityType: "Channel",
      entityId: channel.id,
      after: { imported, skipped, failed },
    },
  });

  return { imported, skipped, failed };
}