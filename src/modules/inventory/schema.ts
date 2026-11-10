import { z } from "zod";

export const adjustStockSchema = z.object({
  variantId: z.string().min(1, "请选择 SKU"),
  warehouseId: z.string().min(1, "请选择仓库"),
  locationId: z.string().min(1, "请选择库位"),
  mode: z.enum(["IN", "OUT", "SET"]),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "数量必须是最多 4 位小数的非负数")
    .refine((value) => Number(value) > 0, "数量必须大于 0"),
  unitCost: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "成本必须是最多 4 位小数的非负数")
    .optional()
    .default("0"),
  note: z.string().trim().max(300, "备注过长").optional().default(""),
});

export const transferStockSchema = z.object({
  variantId: z.string().min(1, "请选择 SKU"),
  fromWarehouseId: z.string().min(1, "请选择调出仓库"),
  fromLocationId: z.string().min(1, "请选择调出库位"),
  toWarehouseId: z.string().min(1, "请选择调入仓库"),
  toLocationId: z.string().min(1, "请选择调入库位"),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "数量必须是最多 4 位小数的非负数")
    .refine((value) => Number(value) > 0, "数量必须大于 0"),
  note: z.string().trim().max(300, "备注过长").optional().default(""),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type TransferStockInput = z.infer<typeof transferStockSchema>;