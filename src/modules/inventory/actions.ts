"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { adjustStockSchema, transferStockSchema } from "@/modules/inventory/schema";
import { adjustStock, transferStock } from "@/modules/inventory/service";
import { completeStockTake, createStockTake } from "@/modules/inventory/stocktake-service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

export async function adjustStockAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { organizationId, user } = await requirePermission("inventory.write");
    const parsed = adjustStockSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    await adjustStock(parsed.data, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/");
  redirect("/inventory");
}

export async function transferStockAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { organizationId, user } = await requirePermission("inventory.transfer");
    const parsed = transferStockSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    await transferStock(parsed.data, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/");
  redirect("/inventory");
}
const createStockTakeSchema = z.object({
  warehouseId: z.string().min(1, "请选择仓库"),
  note: z.string().trim().max(300, "备注过长").optional().default(""),
});

export async function createStockTakeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("inventory.write");
    const parsed = createStockTakeSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const stockTake = await createStockTake(parsed.data, { organizationId, actorId: user.id });
    id = stockTake.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/inventory/stocktake");
  redirect(`/inventory/stocktake/${id}`);
}

export async function completeStockTakeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("inventory.write");
    id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "盘点单不存在。" };

    const counts: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("counted_")) continue;
      const text = String(value).trim();
      if (text && !/^\d+(\.\d{1,4})?$/.test(text)) {
        return { ok: false, error: "实盘数量格式不正确（最多 4 位小数）。" };
      }
      counts[key.slice(8)] = text;
    }

    await completeStockTake(id, counts, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/stocktake");
  revalidatePath(`/inventory/stocktake/${id}`);
  redirect(`/inventory/stocktake/${id}`);
}
