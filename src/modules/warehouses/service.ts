import "server-only";

import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import type {
  CreateLocationInput,
  CreateWarehouseInput,
  UpdateWarehouseInput,
} from "@/modules/warehouses/schema";

type ActorContext = { organizationId: string; actorId: string };

export async function createWarehouse(input: CreateWarehouseInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.warehouse.updateMany({
        where: { organizationId: ctx.organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const warehouse = await tx.warehouse.create({
      data: {
        organizationId: ctx.organizationId,
        code: input.code,
        name: input.name,
        address: input.address || null,
        isDefault: input.isDefault,
      },
    });

    await tx.warehouseLocation.create({
      data: {
        organizationId: ctx.organizationId,
        warehouseId: warehouse.id,
        code: "DEFAULT",
        name: "默认库位",
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "warehouse.create",
      entityType: "Warehouse",
      entityId: warehouse.id,
      after: auditJson(warehouse),
    });

    return warehouse;
  });
}

export async function updateWarehouse(input: UpdateWarehouseInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.warehouse.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    if (!existing) throw new AppError("NOT_FOUND", "仓库不存在。");

    if (input.isDefault) {
      await tx.warehouse.updateMany({
        where: { organizationId: ctx.organizationId, isDefault: true, id: { not: existing.id } },
        data: { isDefault: false },
      });
    }

    const warehouse = await tx.warehouse.update({
      where: { id: existing.id },
      data: {
        code: input.code,
        name: input.name,
        address: input.address || null,
        status: input.status,
        isDefault: input.isDefault,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "warehouse.update",
      entityType: "Warehouse",
      entityId: warehouse.id,
      before: auditJson(existing),
      after: auditJson(warehouse),
    });

    return warehouse;
  });
}

export async function createLocation(input: CreateLocationInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findFirst({
      where: { id: input.warehouseId, organizationId: ctx.organizationId },
    });
    if (!warehouse) throw new AppError("NOT_FOUND", "仓库不存在。");

    const location = await tx.warehouseLocation.create({
      data: {
        organizationId: ctx.organizationId,
        warehouseId: warehouse.id,
        code: input.code,
        name: input.name,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "warehouse.location.create",
      entityType: "WarehouseLocation",
      entityId: location.id,
      after: auditJson(location),
    });

    return location;
  });
}