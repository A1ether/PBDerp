import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requirePermission } from "@/lib/session";
import { updateWarehouseAction } from "@/modules/warehouses/actions";
import { getWarehouse } from "@/modules/warehouses/queries";

export const metadata = { title: "编辑仓库" };

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("warehouse.write");
  const warehouse = await getWarehouse(organizationId, id);
  if (!warehouse) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="编辑仓库" description={warehouse.name} />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={updateWarehouseAction}
            submitLabel="保存修改"
            cancel={<Link href={`/warehouses/${warehouse.id}`} className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <input type="hidden" name="id" value={warehouse.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="仓库编码" name="code" required defaultValue={warehouse.code} />
              <TextField label="仓库名称" name="name" required defaultValue={warehouse.name} />
              <NativeSelect
                label="状态"
                name="status"
                defaultValue={warehouse.status}
                options={[
                  { value: "ACTIVE", label: "启用" },
                  { value: "INACTIVE", label: "停用" },
                ]}
              />
            </div>
            <TextField label="地址" name="address" defaultValue={warehouse.address} />
            <div className="flex items-center gap-2">
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                defaultChecked={warehouse.isDefault}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="isDefault">设为默认仓库</Label>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}