import { z } from "zod";

function checkbox(value: unknown) {
  return value === "on" || value === "true" || value === "1";
}

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1, "仓库编码不能为空").max(32),
  name: z.string().trim().min(1, "仓库名称不能为空").max(100),
  address: z.string().trim().max(300).optional().default(""),
  isDefault: z.preprocess(checkbox, z.boolean()),
});

export const updateWarehouseSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1, "仓库编码不能为空").max(32),
  name: z.string().trim().min(1, "仓库名称不能为空").max(100),
  address: z.string().trim().max(300).optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  isDefault: z.preprocess(checkbox, z.boolean()),
});

export const createLocationSchema = z.object({
  warehouseId: z.string().min(1),
  code: z.string().trim().min(1, "库位编码不能为空").max(32),
  name: z.string().trim().min(1, "库位名称不能为空").max(100),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;