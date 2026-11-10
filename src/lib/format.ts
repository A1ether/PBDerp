import { format } from "date-fns";

import { money, quantity, type DecimalInput } from "@/lib/money";

export function formatMoney(value: DecimalInput, currency = "CNY") {
  const amount = Number(money(value));
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatQuantity(value: DecimalInput) {
  return quantity(value);
}

export function formatDate(value: Date | string | null | undefined, pattern = "yyyy-MM-dd") {
  if (!value) return "-";
  return format(new Date(value), pattern);
}

export function formatDateTime(value: Date | string | null | undefined) {
  return formatDate(value, "yyyy-MM-dd HH:mm");
}