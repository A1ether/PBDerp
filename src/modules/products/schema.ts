import { z } from "zod";

function decimalField(label: string, options?: { positive?: boolean }) {
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return "0";
      return String(value).trim();
    },
    z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, `${label}必须是最多 4 位小数的非负数`)
      .refine((value) => !options?.positive || Number(value) > 0, `${label}必须大于 0`),
  );
}

function optionalId() {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : String(value)),
    z.string().nullable().optional(),
  );
}

export const createProductSchema = z.object({
  code: z.string().trim().min(1, "商品编码不能为空").max(64, "商品编码过长"),
  name: z.string().trim().min(1, "商品名称不能为空").max(200, "商品名称过长"),
  categoryId: optionalId(),
  brandId: optionalId(),
  unitId: optionalId(),
  description: z.string().trim().max(2000, "描述过长").optional().default(""),
  imageUrl: z.string().trim().max(500, "图片地址过长").optional().default(""),
  sku: z.string().trim().min(1, "SKU 不能为空").max(64, "SKU 过长"),
  barcode: z.string().trim().max(64, "条码过长").optional().default(""),
  variantName: z.string().trim().max(200, "规格名称过长").optional().default(""),
  purchasePrice: decimalField("采购价"),
  salePrice: decimalField("销售价"),
  reorderPoint: decimalField("补货点"),
});

export const updateProductSchema = z.object({
  id: z.string().min(1),
  code: z.string().trim().min(1, "商品编码不能为空").max(64),
  name: z.string().trim().min(1, "商品名称不能为空").max(200),
  categoryId: optionalId(),
  brandId: optionalId(),
  unitId: optionalId(),
  description: z.string().trim().max(2000).optional().default(""),
  imageUrl: z.string().trim().max(500).optional().default(""),
});

export const createVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(1, "SKU 不能为空").max(64),
  barcode: z.string().trim().max(64).optional().default(""),
  name: z.string().trim().min(1, "规格名称不能为空").max(200),
  purchasePrice: decimalField("采购价"),
  salePrice: decimalField("销售价"),
  reorderPoint: decimalField("补货点"),
});

export const updateVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "规格名称不能为空").max(200),
  barcode: z.string().trim().max(64).optional().default(""),
  purchasePrice: decimalField("采购价"),
  salePrice: decimalField("销售价"),
  reorderPoint: decimalField("补货点"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;