"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError, isUniqueViolation, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import {
  createProductSchema,
  createVariantSchema,
  updateProductSchema,
  updateVariantSchema,
} from "@/modules/products/schema";
import {
  archiveProduct,
  createProduct,
  createVariant,
  updateProduct,
  updateVariant,
} from "@/modules/products/service";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

function uniqueError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError("CONFLICT", "商品编码、SKU 或条码已存在，请更换后重试。");
  }
  throw error;
}

export async function createProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let productId: string;

  try {
    const { organizationId, user } = await requirePermission("products.write");
    const parsed = createProductSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);

    const product = await createProduct(parsed.data, { organizationId, actorId: user.id }).catch(uniqueError);
    productId = product.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/products");
  redirect(`/products/${productId}`);
}

export async function updateProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let productId: string;

  try {
    const { organizationId, user } = await requirePermission("products.write");
    const parsed = updateProductSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);

    const product = await updateProduct(parsed.data, { organizationId, actorId: user.id }).catch(uniqueError);
    productId = product.id;
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

export async function createVariantAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let productId: string;

  try {
    const { organizationId, user } = await requirePermission("products.write");
    const parsed = createVariantSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);

    productId = parsed.data.productId;
    await createVariant(parsed.data, { organizationId, actorId: user.id }).catch(uniqueError);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

export async function updateVariantAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let productId: string;

  try {
    const { organizationId, user } = await requirePermission("products.write");
    const parsed = updateVariantSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return validationError(parsed.error);

    productId = String(formData.get("productId") ?? "");
    await updateVariant(parsed.data, { organizationId, actorId: user.id }).catch(uniqueError);
  } catch (error) {
    return toActionError(error);
  }

  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const { organizationId, user } = await requirePermission("products.write");
  await archiveProduct(id, { organizationId, actorId: user.id });
  revalidatePath("/products");
  redirect("/products");
}