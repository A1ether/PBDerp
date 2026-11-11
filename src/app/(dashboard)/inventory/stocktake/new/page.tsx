import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { createStockTakeAction } from "@/modules/inventory/actions";
import { listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "新建盘点" };

export default async function NewStockTakePage() {
  const { organizationId } = await requirePermission("inventory.write");
  const warehouses = await listWarehouseOptions(organizationId);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="新建盘点" description="创建时会快照该仓库当前库存；完成盘点时按实盘数调整。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createStockTakeAction}
            submitLabel="创建盘点单"
            cancel={<Link href="/inventory/stocktake" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <NativeSelect
              label="仓库"
              name="warehouseId"
              required
              options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.name }))}
            />
            <TextAreaField label="备注" name="note" placeholder="例如：月末全仓盘点" rows={3} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}