"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError, isUniqueViolation, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import {
  createCustomerSchema,
  createSupplierSchema,
  updateCustomerSchema,
  updateSupplierSchema,
} from "@/modules/partners/schema";
import {
  createCustomer,
  createSupplier,
  updateCustomer,
  updateSupplier,
} from "@/modules/partners/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function handleUnique(error: unknown): never {
  if (isUniqueViolation(error)) throw new AppError("CONFLICT", "编码已存在，请更换后重试。");
  throw error;
}

export async function createCustomerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("partners.write");
    const parsed = createCustomerSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const customer = await createCustomer(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = customer.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/partners");
  revalidatePath("/partners/customers");
  redirect(`/partners/customers/${id}/edit`);
}

export async function updateCustomerAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("partners.write");
    const parsed = updateCustomerSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const customer = await updateCustomer(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = customer.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/partners");
  revalidatePath("/partners/customers");
  redirect(`/partners/customers/${id}/edit`);
}

export async function createSupplierAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("partners.write");
    const parsed = createSupplierSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const supplier = await createSupplier(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = supplier.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/partners");
  revalidatePath("/partners/suppliers");
  redirect(`/partners/suppliers/${id}/edit`);
}

export async function updateSupplierAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("partners.write");
    const parsed = updateSupplierSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const supplier = await updateSupplier(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = supplier.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/partners");
  revalidatePath("/partners/suppliers");
  redirect(`/partners/suppliers/${id}/edit`);
}