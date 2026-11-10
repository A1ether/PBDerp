import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { transferStockAction } from "@/modules/inventory/actions";
import { listVariantOptions } from "@/modules/products/queries";
import { listLocationOptions, listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "仓库调拨" };

export default async function TransferStockPage() {
  const { organizationId } = await requirePermission("inventory.transfer");
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
      <PageHeader title="仓库调拨" description="同一事务内完成调出与调入，并生成两条库存流水。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={transferStockAction}
            submitLabel="提交调拨"
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
                label="调出仓库"
                name="fromWarehouseId"
                required
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
              />
              <NativeSelect label="调出库位" name="fromLocationId" required options={locationOptions} />
              <NativeSelect
                label="调入仓库"
                name="toWarehouseId"
                required
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
              />
              <NativeSelect label="调入库位" name="toLocationId" required options={locationOptions} />
              <TextField label="调拨数量" name="quantity" type="number" step="0.0001" min="0" required />
            </div>
            <TextAreaField label="备注" name="note" placeholder="可选" rows={3} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}