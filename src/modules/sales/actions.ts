"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import {
  createSalesOrderSchema,
  recordPaymentSchema,
  salesOrderIdSchema,
} from "@/modules/sales/schema";
import {
  cancelSalesOrder,
  completeSalesOrder,
  confirmSalesOrder,
  createSalesOrder,
  recordSalesPayment,
  shipSalesOrder,
} from "@/modules/sales/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function revalidateOrder(id: string) {
  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/");
}

export async function createSalesOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("sales.write");
    const parsed = createSalesOrderSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const order = await createSalesOrder(parsed.data, { organizationId, actorId: user.id });
    id = order.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}

export async function confirmSalesOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("sales.write");
    const parsed = salesOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await confirmSalesOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}

export async function shipSalesOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("sales.ship");
    const parsed = salesOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await shipSalesOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}

export async function cancelSalesOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("sales.write");
    const parsed = salesOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await cancelSalesOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}

export async function completeSalesOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("sales.write");
    const parsed = salesOrderIdSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await completeSalesOrder(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}

export async function recordSalesPaymentAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("finance.write");
    const parsed = recordPaymentSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    id = parsed.data.id;
    await recordSalesPayment(parsed.data, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}