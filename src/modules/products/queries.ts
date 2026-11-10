import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { PageParams } from "@/lib/pagination";

export async function listProducts(organizationId: string, params: PageParams) {
  const where: Prisma.ProductWhereInput = {
    organizationId,
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { code: { contains: params.q, mode: "insensitive" } },
            { variants: { some: { OR: [{ sku: { contains: params.q, mode: "insensitive" } }, { barcode: { contains: params.q, mode: "insensitive" } }] } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sort === "name"
      ? { name: params.dir }
      : params.sort === "code"
        ? { code: params.dir }
        : { createdAt: params.dir };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total };
}

export async function getProduct(organizationId: string, id: string) {
  return prisma.product.findFirst({
    where: { id, organizationId },
    include: {
      category: true,
      brand: true,
      unit: true,
      variants: {
        orderBy: { createdAt: "asc" },
        include: {
          stockLevels: {
            include: { warehouse: { select: { name: true } }, location: { select: { code: true } } },
          },
        },
      },
    },
  });
}

export async function listVariantOptions(organizationId: string) {
  return prisma.productVariant.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      product: { status: "ACTIVE" },
    },
    orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      salePrice: true,
      purchasePrice: true,
      reorderPoint: true,
      product: { select: { name: true, code: true } },
    },
  });
}

export async function listCategoryOptions(organizationId: string) {
  return prisma.category.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    select: { id: true, name: true, code: true },
  });
}

export async function listBrandOptions(organizationId: string) {
  return prisma.brand.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export async function listUnitOptions(organizationId: string) {
  return prisma.unit.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}