import "server-only";

import { AppError } from "@/lib/errors";
import { headerIndex, parseCsv } from "@/lib/csv";
import type { CreateSalesOrderInput } from "@/modules/sales/schema";

export type ExternalOrderLine = CreateSalesOrderInput["lines"][number];
export type ExternalOrder = {
  externalOrderNo: string;
  customerName: string;
  customerCode?: string;
  customerPhone?: string;
  warehouseCode?: string;
  orderedAt?: string;
  note?: string;
  lines: ExternalOrderLine[];
  raw: Record<string, string>;
};

const REQUIRED_HEADERS = ["externalOrderNo", "customerName", "sku", "quantity", "unitPrice"] as const;

/**
 * CSV import contract: one row per order line, grouped by externalOrderNo.
 * Columns are case-insensitive; unknown columns are ignored.
 */
export function parseOrderCsv(text: string): ExternalOrder[] {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new AppError("VALIDATION_ERROR", "CSV 至少需要表头和一行数据。");
  }

  const headers = rows[0];
  const indexes = {
    externalOrderNo: headerIndex(headers, "externalOrderNo", "orderNo", "订单号"),
    customerName: headerIndex(headers, "customerName", "客户名称"),
    customerCode: headerIndex(headers, "customerCode", "客户编码"),
    customerPhone: headerIndex(headers, "customerPhone", "phone", "客户电话"),
    warehouseCode: headerIndex(headers, "warehouseCode", "仓库编码"),
    orderedAt: headerIndex(headers, "orderedAt", "下单时间"),
    sku: headerIndex(headers, "sku", "SKU"),
    quantity: headerIndex(headers, "quantity", "数量"),
    unitPrice: headerIndex(headers, "unitPrice", "单价"),
    taxRate: headerIndex(headers, "taxRate", "税率"),
    note: headerIndex(headers, "note", "备注"),
  };

  const missing = REQUIRED_HEADERS.filter((header) => indexes[header] < 0);
  if (missing.length > 0) {
    throw new AppError("VALIDATION_ERROR", `CSV 缺少必需列：${missing.join(", ")}。`);
  }

  const groups = new Map<string, ExternalOrder>();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const get = (index: number) => (index >= 0 ? (row[index] ?? "").trim() : "");

    const externalOrderNo = get(indexes.externalOrderNo);
    const sku = get(indexes.sku);
    if (!externalOrderNo || !sku) {
      throw new AppError("VALIDATION_ERROR", `CSV 第 ${rowIndex + 1} 行缺少订单号或 SKU。`);
    }

    const line: ExternalOrderLine = {
      variantId: sku, // resolved to a real variant id by the import service
      quantity: get(indexes.quantity) || "0",
      unitPrice: get(indexes.unitPrice) || "0",
      discount: "0",
      taxRate: get(indexes.taxRate) || "0",
    };

    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = row[index] ?? "";
    });

    const existing = groups.get(externalOrderNo);
    if (existing) {
      existing.lines.push(line);
    } else {
      groups.set(externalOrderNo, {
        externalOrderNo,
        customerName: get(indexes.customerName) || `客户 ${externalOrderNo}`,
        customerCode: get(indexes.customerCode) || undefined,
        customerPhone: get(indexes.customerPhone) || undefined,
        warehouseCode: get(indexes.warehouseCode) || undefined,
        orderedAt: get(indexes.orderedAt) || undefined,
        note: get(indexes.note) || undefined,
        lines: [line],
        raw,
      });
    }
  }

  return [...groups.values()];
}