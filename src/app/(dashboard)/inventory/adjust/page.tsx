import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { adjustStockAction } from "@/modules/inventory/actions";
import { listVariantOptions } from "@/modules/products/queries";
import { listLocationOptions, listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "调整库存" };

export default async function AdjustStockPage() {
  const { organizationId } = await requirePermission("inventory.write");
  const [variants, warehouses, locations] = await Promise.all([
    listVariantOptions(organizationId),
    listWarehouseOptions(organizationId),
    listLocationOptions(organizationId),
  ]);
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.name]));
  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: `${warehouseNames.get(location.warehouseId) ?? "仓库"} / ${location.code} · ${location.name}`,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="调整库存" description="入库、出库或直接设置数量；每次调整都会写入库存流水和审计日志。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={adjustStockAction}
            submitLabel="提交调整"
            cancel={<Link href="/inventory" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <NativeSelect
              label="SKU"
              name="variantId"
              required
              options={variants.map((variant) => ({
                value: variant.id,
                label: `${variant.sku} · ${variant.product.name} · ${variant.name}`,
              }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <NativeSelect
                label="仓库"
                name="warehouseId"
                required
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
              />
              <NativeSelect label="库位" name="locationId" required options={locationOptions} />
              <NativeSelect
                label="调整方式"
                name="mode"
                required
                defaultValue="IN"
                options={[
                  { value: "IN", label: "入库（增加）" },
                  { value: "OUT", label: "出库（减少）" },
                  { value: "SET", label: "盘点（设为）" },
                ]}
              />
              <TextField label="数量" name="quantity" type="number" step="0.0001" min="0" required />
              <TextField label="单位成本" name="unitCost" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <TextAreaField label="原因 / 备注" name="note" placeholder="例如：期初库存、盘盈、样品出库" rows={3} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}