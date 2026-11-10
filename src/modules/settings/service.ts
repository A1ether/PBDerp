import "server-only";

import { hashPassword } from "better-auth/crypto";

import { auditJson, writeAudit } from "@/lib/audit";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db";
import type { CreateUserInput, UpdateUserRoleInput } from "@/modules/settings/schema";

type ActorContext = { organizationId: string; actorId: string };

export async function createUser(input: CreateUserInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("CONFLICT", "该邮箱已被使用。");

    const passwordHash = await hashPassword(input.password);

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        emailVerified: false,
        role: input.role,
        organizationId: ctx.organizationId,
      },
    });

    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
      },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "settings.user.create",
      entityType: "User",
      entityId: user.id,
      after: auditJson({ name: user.name, email: user.email, role: user.role }),
    });

    return user;
  });
}

export async function updateUserRole(input: UpdateUserRoleInput, ctx: ActorContext) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id: input.id, organizationId: ctx.organizationId } });
    if (!user) throw new AppError("NOT_FOUND", "用户不存在。");

    if (user.id === ctx.actorId && input.role !== "ADMIN") {
      throw new AppError("INVALID_STATE", "不能移除自己的管理员角色。");
    }

    if (user.role === "ADMIN" && input.role !== "ADMIN") {
      const adminCount = await tx.user.count({ where: { organizationId: ctx.organizationId, role: "ADMIN" } });
      if (adminCount <= 1) {
        throw new AppError("INVALID_STATE", "至少需要保留一名管理员。");
      }
    }

    const updated = await tx.user.update({
      where: { id: user.id },
      data: { role: input.role },
    });

    await writeAudit(tx, {
      organizationId: ctx.organizationId,
      actorId: ctx.actorId,
      action: "settings.user.role",
      entityType: "User",
      entityId: user.id,
      before: auditJson({ role: user.role }),
      after: auditJson({ role: updated.role }),
    });

    return updated;
  });
}