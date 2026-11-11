"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createSalesReturn, receiveSalesReturn } from "@/modules/returns/service";

const quantitySchema = z.object({
  lineId: z.string().min(1),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "退货数量格式不正确")
    .refine((value) => Number(value) > 0, "退货数量必须大于 0"),
});

function parseReturnLines(formData: FormData) {
  const lines: Array<{ lineId: string; quantity: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const quantity = String(value).trim();
    if (!quantity || Number(quantity) === 0) continue;
    lines.push({ lineId: key.slice(4), quantity });
  }
  const parsed = z.array(quantitySchema).min(1, "请填写至少一行退货数量").safeParse(lines);
  if (!parsed.success) {
    throw new AppError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "退货数量格式不正确");
  }
  return parsed.data;
}

export async function createSalesReturnAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let returnId = "";
  try {
    const { organizationId, user } = await requirePermission("sales.write");
    const orderId = String(formData.get("orderId") ?? "");
    if (!orderId) throw new AppError("VALIDATION_ERROR", "销售订单不存在。");
    const reason = String(formData.get("reason") ?? "").trim();
    const lines = parseReturnLines(formData);
    const salesReturn = await createSalesReturn(
      orderId,
      reason,
      lines.map((line) => ({ orderLineId: line.lineId, quantity: line.quantity })),
      { organizationId, actorId: user.id },
    );
    returnId = salesReturn.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/returns");
  revalidatePath(`/sales`);
  redirect(`/returns/${returnId}`);
}

export async function receiveSalesReturnAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("inventory.write");
    id = String(formData.get("id") ?? "");
    if (!id) throw new AppError("VALIDATION_ERROR", "退货单不存在。");
    await receiveSalesReturn(id, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/returns");
  revalidatePath(`/returns/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  redirect(`/returns/${id}`);
}