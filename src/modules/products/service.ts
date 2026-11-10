import "server-only";

import { AppError } from "@/lib/errors";
import { auditJson, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import type {
  CreateProductInput,
  CreateVariantInput,
  UpdateProductInput,
  UpdateVariantInput,
} from "@/modules/products/schema";

type ActorContext = {
  organizationId: string;
  actorId: string;
};

export async function createProduct(input: CreateProductInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        organizationId: ctx.organizationId,
        code: input.code,
        name: input.name,
        categoryId: input.categoryId ?? null,
        brandId: input.brandId ?? null,
        unitId: input.unitId ?? null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
      },
    });

    const variant = await tx.productVariant.create({
      data: {
        organizationId: ctx.organizationId,
        productId: product.id,
        sku: input.sku,
        barcode: input.barcode || null,
        name: input.variantName || product.name,
        purchasePrice: input.purchasePrice,
        salePrice: input.salePrice,
        reorderPoint: input.reorderPoint,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      after: auditJson({ product, variant }),
    });

    return product;
  });
}

export async function updateProduct(input: UpdateProductInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "商品不存在。");
    }

    const product = await tx.product.update({
      where: { id: existing.id },
      data: {
        code: input.code,
        name: input.name,
        categoryId: input.categoryId ?? null,
        brandId: input.brandId ?? null,
        unitId: input.unitId ?? null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "product.update",
      entityType: "Product",
      entityId: product.id,
      before: auditJson(existing),
      after: auditJson(product),
    });

    return product;
  });
}

export async function createVariant(input: CreateVariantInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, organizationId: ctx.organizationId },
    });
    if (!product) {
      throw new AppError("NOT_FOUND", "商品不存在。");
    }

    const variant = await tx.productVariant.create({
      data: {
        organizationId: ctx.organizationId,
        productId: product.id,
        sku: input.sku,
        barcode: input.barcode || null,
        name: input.name,
        purchasePrice: input.purchasePrice,
        salePrice: input.salePrice,
        reorderPoint: input.reorderPoint,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "product.variant.create",
      entityType: "ProductVariant",
      entityId: variant.id,
      after: auditJson(variant),
    });

    return variant;
  });
}

export async function updateVariant(input: UpdateVariantInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.productVariant.findFirst({
      where: { id: input.id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "SKU 不存在。");
    }

    const variant = await tx.productVariant.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        barcode: input.barcode || null,
        purchasePrice: input.purchasePrice,
        salePrice: input.salePrice,
        reorderPoint: input.reorderPoint,
        status: input.status,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "product.variant.update",
      entityType: "ProductVariant",
      entityId: variant.id,
      before: auditJson(existing),
      after: auditJson(variant),
    });

    return variant;
  });
}

export async function archiveProduct(id: string, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      throw new AppError("NOT_FOUND", "商品不存在。");
    }

    const product = await tx.product.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "product.archive",
      entityType: "Product",
      entityId: product.id,
      before: auditJson(existing),
      after: auditJson(product),
    });

    return product;
  });
}