"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import {
  createPurchaseOrderSchema,
  purchaseOrderIdSchema,
  recordSupplierPaymentSchema,
} from "@/modules/purchases/schema";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  markPurchaseOrderOrdered,
  receivePurchaseOrder,
  recordSupplierPayment,
} from "@/modules/purchases/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function revalidateOrder(id: string) {
  revalidatePath("/purchases");
  revalidatePath(`/purchases/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/");
}

export async function createPurchaseOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("purchase.write");
    const parsed = createPurchaseOrderSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const order = await createPurchaseOrder(parsed.data, { organizationId, actorId: user.id });
    id = order.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}

export async function approvePurchaseOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("purchase.write");
    const parsed = purchaseOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await approvePurchaseOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}

export async function markPurchaseOrderOrderedAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("purchase.write");
    const parsed = purchaseOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await markPurchaseOrderOrdered(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}

export async function receivePurchaseOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("purchase.receive");
    const parsed = purchaseOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await receivePurchaseOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}

export async function cancelPurchaseOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("purchase.write");
    const parsed = purchaseOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await cancelPurchaseOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}

export async function recordSupplierPaymentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("finance.write");
    const parsed = recordSupplierPaymentSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await recordSupplierPayment(parsed.data, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/purchases/${id}`);
}