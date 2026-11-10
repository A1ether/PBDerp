import { z } from "zod";

const lineSchema = z.object({
  variantId: z.string().min(1, "请选择 SKU"),
  quantity: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "数量格式不正确")
    .refine((value) => Number(value) > 0, "数量必须大于 0"),
  unitPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "单价格式不正确"),
  discount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "折扣格式不正确")
    .optional()
    .default("0"),
  taxRate: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,4})?$/, "税率格式不正确")
    .optional()
    .default("0"),
});

const linesField = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  },
  z.array(lineSchema).min(1, "请至少添加一行商品"),
);

export const createSalesOrderSchema = z.object({
  customerId: z.string().min(1, "请选择客户"),
  warehouseId: z.string().min(1, "请选择发货仓库"),
  orderedAt: z.string().optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  lines: linesField,
});

export const salesOrderIdSchema = z.object({
  id: z.string().min(1),
});

export const recordPaymentSchema = z.object({
  id: z.string().min(1),
  amount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "金额必须是最多 2 位小数的非负数")
    .refine((value) => Number(value) > 0, "金额必须大于 0"),
  method: z.enum(["CASH", "BANK_TRANSFER", "ALIPAY", "WECHAT", "CARD", "OTHER"]).default("BANK_TRANSFER"),
  paidAt: z.string().optional().default(""),
  note: z.string().trim().max(300).optional().default(""),
});

export type SalesOrderLineInput = z.infer<typeof lineSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;