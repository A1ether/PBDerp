"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isUniqueViolation, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createUserSchema, updateUserRoleSchema } from "@/modules/settings/schema";
import { createUser, updateUserRole } from "@/modules/settings/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

export async function createUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { organizationId, user } = await requirePermission("settings.write");
    const parsed = createUserSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    await createUser(parsed.data, { organizationId, actorId: user.id }).catch((error) => {
      if (isUniqueViolation(error)) throw error;
      throw error;
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function updateUserRoleAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { organizationId, user } = await requirePermission("settings.write");
    const parsed = updateUserRoleSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    await updateUserRole(parsed.data, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/settings/users");
  redirect("/settings/users");
}