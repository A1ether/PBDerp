"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isUniqueViolation, AppError, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import {
  createLocationSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
} from "@/modules/warehouses/schema";
import { createLocation, createWarehouse, updateWarehouse } from "@/modules/warehouses/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function handleUnique(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError("CONFLICT", "仓库编码或库位编码已存在。");
  }
  throw error;
}

export async function createWarehouseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("warehouse.write");
    const parsed = createWarehouseSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const warehouse = await createWarehouse(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = warehouse.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/warehouses");
  redirect(`/warehouses/${id}`);
}

export async function updateWarehouseAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { organizationId, user } = await requirePermission("warehouse.write");
    const parsed = updateWarehouseSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const warehouse = await updateWarehouse(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
    id = warehouse.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/warehouses");
  revalidatePath(`/warehouses/${id}`);
  redirect(`/warehouses/${id}`);
}

export async function createLocationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let warehouseId: string;
  try {
    const { organizationId, user } = await requirePermission("warehouse.write");
    const parsed = createLocationSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    warehouseId = parsed.data.warehouseId;
    await createLocation(parsed.data, { organizationId, actorId: user.id }).catch(handleUnique);
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/warehouses/${warehouseId}`);
  redirect(`/warehouses/${warehouseId}`);
}