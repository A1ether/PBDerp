import Decimal from "decimal.js";

export type DecimalInput = string | number | Decimal | null | undefined;

export function dec(value: DecimalInput): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  return new Decimal(value);
}

export function money(value: DecimalInput): string {
  return dec(value).toFixed(2);
}

export function quantity(value: DecimalInput): string {
  const text = dec(value).toFixed(4);
  return text.replace(/\.?0+$/, "") || "0";
}

export function sum(values: DecimalInput[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(dec(value)), new Decimal(0));
}

export function lineAmount(quantity: DecimalInput, unitPrice: DecimalInput, discount: DecimalInput = 0) {
  return dec(quantity).times(dec(unitPrice)).minus(dec(discount)).toDecimalPlaces(2);
}

export function taxAmount(base: DecimalInput, taxRate: DecimalInput) {
  return dec(base).times(dec(taxRate)).toDecimalPlaces(2);
}

export function assertNonNegative(value: DecimalInput, label: string) {
  if (dec(value).isNegative()) {
    throw new Error(`${label}不能为负数`);
  }
}

export function assertPositive(value: DecimalInput, label: string) {
  if (!dec(value).isPositive()) {
    throw new Error(`${label}必须大于 0`);
  }
}