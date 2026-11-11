"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AppError, isUniqueViolation, toActionError, type ActionState } from "@/lib/errors";
import { requirePermission } from "@/lib/session";
import { createChannelSchema, importOrdersSchema } from "@/modules/channels/schema";
import { createChannel, importOrders } from "@/modules/channels/service";

function validationError(error: z.ZodError): ActionState {
  return {
    ok: false,
    error: "请检查表单中的必填项和格式。",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  };
}

export async function createChannelAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    const { organizationId, user } = await requirePermission("channels.write");
    const parsed = createChannelSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    const channel = await createChannel(parsed.data, { organizationId, actorId: user.id }).catch((error) => {
      if (isUniqueViolation(error)) throw new AppError("CONFLICT", "渠道编码已存在。");
      throw error;
    });
    id = channel.id;
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/channels");
  redirect(`/channels/${id}`);
}

export async function importOrdersAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  let channelId = "";
  let result = { imported: 0, skipped: 0, failed: 0 };
  try {
    const { organizationId, user } = await requirePermission("channels.write");
    const parsed = importOrdersSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return validationError(parsed.error);
    channelId = parsed.data.channelId;
    result = await importOrders(channelId, parsed.data.csv, { organizationId, actorId: user.id });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/channels");
  revalidatePath(`/channels/${channelId}`);
  revalidatePath("/sales");
  redirect(`/channels/${channelId}?imported=${result.imported}&skipped=${result.skipped}&failed=${result.failed}`);
}