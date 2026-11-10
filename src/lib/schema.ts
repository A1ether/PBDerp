import { z } from "zod";

export function decimalField(label: string, options?: { positive?: boolean; scale?: number }) {
  const scale = options?.scale ?? 4;
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${scale}})?$`);
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return "0";
      return String(value).trim();
    },
    z
      .string()
      .regex(pattern, `${label}必须是最多 ${scale} 位小数的非负数`)
      .refine((value) => !options?.positive || Number(value) > 0, `${label}必须大于 0`),
  );
}

export function optionalId() {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : String(value)),
    z.string().nullable().optional(),
  );
}

export function optionalEmail() {
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : String(value).trim()),
    z.email("邮箱格式不正确").optional(),
  );
}

export function optionalText(max: number, label: string) {
  return z.string().trim().max(max, `${label}过长`).optional().default("");
}

export function checkbox(value: unknown) {
  return value === "on" || value === "true" || value === "1";
}