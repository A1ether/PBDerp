import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "姓名不能为空").max(100),
  email: z.email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(128),
  role: z.enum(["ADMIN", "MANAGER", "SALES", "PURCHASER", "WAREHOUSE", "FINANCE", "VIEWER"]),
});

export const updateUserRoleSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "SALES", "PURCHASER", "WAREHOUSE", "FINANCE", "VIEWER"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;