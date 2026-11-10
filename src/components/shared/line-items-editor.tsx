"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";

export type LineVariantOption = {
  id: string;
  sku: string;
  name: string;
  productName: string;
  price: string;
};

type Row = {
  key: string;
  variantId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
};

function newRow(price = "0"): Row {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    variantId: "",
    quantity: "1",
    unitPrice: price,
    discount: "0",
    taxRate: "0",
  };
}

export function LineItemsEditor({
  mode,
  variants,
}: {
  mode: "sale" | "purchase";
  variants: LineVariantOption[];
}) {
  const [rows, setRows] = useState<Row[]>([newRow()]);

  const variantMap = useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function selectVariant(key: string, variantId: string) {
    const variant = variantMap.get(variantId);
    updateRow(key, {
      variantId,
      unitPrice: variant?.price ?? "0",
    });
  }

  const totals = rows.reduce(
    (acc, row) => {
      const quantity = Number(row.quantity) || 0;
      const unitPrice = Number(row.unitPrice) || 0;
      const discount = mode === "sale" ? Number(row.discount) || 0 : 0;
      const lineTotal = Math.max(0, quantity * unitPrice - discount);
      const tax = lineTotal * (Number(row.taxRate) || 0);
      return {
        subtotal: acc.subtotal + lineTotal,
        discount: acc.discount + discount,
        tax: acc.tax + tax,
      };
    },
    { subtotal: 0, discount: 0, tax: 0 },
  );

  const serialized = JSON.stringify(
    rows
      .filter((row) => row.variantId)
      .map((row) =>
        mode === "sale"
          ? {
              variantId: row.variantId,
              quantity: row.quantity || "0",
              unitPrice: row.unitPrice || "0",
              discount: row.discount || "0",
              taxRate: row.taxRate || "0",
            }
          : {
              variantId: row.variantId,
              quantity: row.quantity || "0",
              unitCost: row.unitPrice || "0",
              taxRate: row.taxRate || "0",
            },
      ),
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="lines" value={serialized} />
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">商品明细</p>
          <p className="text-xs text-muted-foreground">
            {mode === "sale" ? "售价默认取 SKU 销售价，可手工改价。" : "成本默认取 SKU 采购价，可手工调整。"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((current) => [...current, newRow()])}>
          <Plus className="size-3.5" /> 添加一行
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 font-medium">SKU</th>
              <th className="w-24 px-2 py-2 font-medium">数量</th>
              <th className="w-28 px-2 py-2 font-medium">{mode === "sale" ? "单价" : "成本"}</th>
              {mode === "sale" ? <th className="w-24 px-2 py-2 font-medium">折扣</th> : null}
              <th className="w-24 px-2 py-2 font-medium">税率</th>
              <th className="w-28 px-2 py-2 text-right font-medium">小计</th>
              <th className="w-14 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const variant = variantMap.get(row.variantId);
              const quantity = Number(row.quantity) || 0;
              const unitPrice = Number(row.unitPrice) || 0;
              const discount = mode === "sale" ? Number(row.discount) || 0 : 0;
              const lineTotal = Math.max(0, quantity * unitPrice - discount);
              return (
                <tr key={row.key} className="border-t">
                  <td className="px-2 py-2">
                    <select
                      value={row.variantId}
                      onChange={(event) => selectVariant(row.key, event.target.value)}
                      className="h-8 w-full min-w-[260px] rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
                    >
                      <option value="">选择 SKU</option>
                      {variants.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.sku} · {option.productName} · {option.name}
                        </option>
                      ))}
                    </select>
                    {variant ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        参考价 {formatMoney(variant.price)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={row.quantity}
                      onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                      className="h-8"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                      className="h-8"
                    />
                  </td>
                  {mode === "sale" ? (
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.discount}
                        onChange={(event) => updateRow(row.key, { discount: event.target.value })}
                        className="h-8"
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.taxRate}
                      onChange={(event) => updateRow(row.key, { taxRate: event.target.value })}
                      className="h-8"
                      placeholder="0.13"
                    />
                  </td>
                  <td className="px-2 py-2 text-right font-medium">{formatMoney(lineTotal)}</td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRows((current) => (current.length === 1 ? current : current.filter((item) => item.key !== row.key)))}
                      aria-label="删除行"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex w-56 justify-between text-muted-foreground">
          <span>商品小计</span>
          <span>{formatMoney(totals.subtotal)}</span>
        </div>
        {mode === "sale" ? (
          <div className="flex w-56 justify-between text-muted-foreground">
            <span>折扣</span>
            <span>-{formatMoney(totals.discount)}</span>
          </div>
        ) : null}
        <div className="flex w-56 justify-between text-muted-foreground">
          <span>税额</span>
          <span>{formatMoney(totals.tax)}</span>
        </div>
        <div className="flex w-56 justify-between border-t pt-1 font-semibold">
          <span>合计</span>
          <span>{formatMoney(totals.subtotal - totals.discount + totals.tax)}</span>
        </div>
        <p className="text-xs text-muted-foreground">最终金额以服务端计算为准。</p>
      </div>
    </div>
  );
}