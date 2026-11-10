import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { LineItemsEditor } from "@/components/shared/line-items-editor";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { listCustomerOptions } from "@/modules/partners/queries";
import { listVariantOptions } from "@/modules/products/queries";
import { createSalesOrderAction } from "@/modules/sales/actions";
import { listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "新建销售订单" };

export default async function NewSalesOrderPage() {
  const { organizationId } = await requirePermission("sales.write");
  const [customers, warehouses, variants] = await Promise.all([
    listCustomerOptions(organizationId),
    listWarehouseOptions(organizationId),
    listVariantOptions(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="新建销售订单" description="先保存草稿；确认订单时才会校验并预留库存。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createSalesOrderAction}
            submitLabel="保存草稿"
            cancel={<Link href="/sales" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <NativeSelect
                label="客户"
                name="customerId"
                required
                options={customers.map((customer) => ({ value: customer.id, label: `${customer.name} (${customer.code})` }))}
              />
              <NativeSelect
                label="发货仓库"
                name="warehouseId"
                required
                options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
              />
              <TextField label="下单日期" name="orderedAt" type="date" />
            </div>

            <LineItemsEditor
              mode="sale"
              variants={variants.map((variant) => ({
                id: variant.id,
                sku: variant.sku,
                name: variant.name,
                productName: variant.product.name,
                price: variant.salePrice.toString(),
              }))}
            />

            <TextAreaField label="备注" name="note" placeholder="可选" rows={3} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}