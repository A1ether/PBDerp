import "server-only";

import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import type {
  CreateCustomerInput,
  CreateSupplierInput,
  UpdateCustomerInput,
  UpdateSupplierInput,
} from "@/modules/partners/schema";

type ActorContext = { organizationId: string; actorId: string };

type PartnerFields = {
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNo?: string;
};

function partnerData(input: PartnerFields) {
  return {
    code: input.code,
    name: input.name,
    contact: input.contact || null,
    phone: input.phone || null,
    email: input.email || null,
    address: input.address || null,
    taxNo: input.taxNo || null,
  };
}

export async function createCustomer(input: CreateCustomerInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        organizationId: ctx.organizationId,
        ...partnerData(input),
        creditLimit: input.creditLimit,
      },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "customer.create",
      entityType: "Customer",
      entityId: customer.id,
      after: auditJson(customer),
    });
    return customer;
  });
}

export async function updateCustomer(input: UpdateCustomerInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.customer.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
    if (!existing) throw new AppError("NOT_FOUND", "客户不存在。");

    const customer = await tx.customer.update({
      where: { id: existing.id },
      data: { ...partnerData(input), creditLimit: input.creditLimit, status: input.status },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "customer.update",
      entityType: "Customer",
      entityId: customer.id,
      before: auditJson(existing),
      after: auditJson(customer),
    });
    return customer;
  });
}

export async function createSupplier(input: CreateSupplierInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        organizationId: ctx.organizationId,
        ...partnerData(input),
      },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "supplier.create",
      entityType: "Supplier",
      entityId: supplier.id,
      after: auditJson(supplier),
    });
    return supplier;
  });
}

export async function updateSupplier(input: UpdateSupplierInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplier.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
    if (!existing) throw new AppError("NOT_FOUND", "供应商不存在。");

    const supplier = await tx.supplier.update({
      where: { id: existing.id },
      data: { ...partnerData(input), status: input.status },
    });
    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "supplier.update",
      entityType: "Supplier",
      entityId: supplier.id,
      before: auditJson(existing),
      after: auditJson(supplier),
    });
    return supplier;
  });
}