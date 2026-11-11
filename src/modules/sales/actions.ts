"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError, toActionError, type ActionState } from "@/lib/errors";
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
  shipSalesOrderWithLines,
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
const shipQuantitySchema = z.object({
  lineId: z.string().min(1),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "出库数量格式不正确")
    .refine((value) => Number(value) > 0, "出库数量必须大于 0"),
});

function parseShipLines(formData: FormData) {
  const lines: Array<{ lineId: string; quantity: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const quantity = String(value).trim();
    if (!quantity || Number(quantity) === 0) continue;
    lines.push({ lineId: key.slice(4), quantity });
  }

  const parsed = z.array(shipQuantitySchema).min(1, "请填写至少一行出库数量").safeParse(lines);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "出库数量格式不正确");
  }
  return parsed.data;
}

export async function shipSalesOrderPartialAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("sales.ship");
    id = String(formData.get("id") ?? "");
    if (!id) throw new AppError("VALIDATION_ERROR", "订单不存在。");
    const lines = parseShipLines(formData);
    await shipSalesOrderWithLines(id, lines, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidateOrder(id);
  redirect(`/sales/${id}`);
}
