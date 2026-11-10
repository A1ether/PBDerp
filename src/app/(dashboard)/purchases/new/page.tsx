import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { LineItemsEditor } from "@/components/shared/line-items-editor";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { listSupplierOptions } from "@/modules/partners/queries";
import { listVariantOptions } from "@/modules/products/queries";
import { createPurchaseOrderAction } from "@/modules/purchases/actions";
import { listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "新建采购订单" };

export default async function NewPurchaseOrderPage() {
  const { organizationId } = await requirePermission("purchase.write");
  const [suppliers, warehouses, variants] = await Promise.all([
    listSupplierOptions(organizationId),
    listWarehouseOptions(organizationId),
    listVariantOptions(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="新建采购订单" description="先保存草稿；审批并收货后库存增加。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createPurchaseOrderAction}
            submitLabel="保存草稿"
            cancel={<Link href="/purchases" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <NativeSelect
                label="供应商"
                name="supplierId"
                required
                options={suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier.name} (${supplier.code})` }))}
              />
              <NativeSelect
                label="收货仓库"
                name="warehouseId"
                required
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
              />
              <TextField label="预计到货" name="expectedAt" type="date" />
            </div>

            <LineItemsEditor
              mode="purchase"
              variants={variants.map((variant) => ({
                id: variant.id,
                sku: variant.sku,
                name: variant.name,
                productName: variant.product.name,
                price: variant.purchasePrice.toString(),
              }))}
            />

            <TextAreaField label="备注" name="note" placeholder="可选" rows={3} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}