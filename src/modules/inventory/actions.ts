"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { adjustStockSchema, transferStockSchema } from "@/modules/inventory/schema";
import { adjustStock, transferStock } from "@/modules/inventory/service";

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