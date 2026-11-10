import { z } from "zod";

import { decimalField, optionalEmail, optionalText } from "@/lib/schema";

const partnerFields = {
  code: z.string().trim().min(1, "编码不能为空").max(64),
  name: z.string().trim().min(1, "名称不能为空").max(200),
  contact: optionalText(100, "联系人"),
  phone: optionalText(50, "电话"),
  email: optionalEmail(),
  address: optionalText(300, "地址"),
  taxNo: optionalText(64, "税号"),
};

export const createCustomerSchema = z.object({
  ...partnerFields,
  creditLimit: decimalField("信用额度", { scale: 2 }),
});

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const createSupplierSchema = z.object({
  ...partnerFields,
});

export const updateSupplierSchema = createSupplierSchema.extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;