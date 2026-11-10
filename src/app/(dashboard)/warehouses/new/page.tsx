import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { requirePermission } from "@/lib/session";
import { createWarehouseAction } from "@/modules/warehouses/actions";

export const metadata = { title: "新建仓库" };

export default async function NewWarehousePage() {
  await requirePermission("warehouse.write");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="新建仓库" description="创建后会自动生成一个 DEFAULT 默认库位。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createWarehouseAction}
            submitLabel="创建仓库"
            cancel={<Link href="/warehouses" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="仓库编码" name="code" required placeholder="例如 WH-001" />
              <TextField label="仓库名称" name="name" required placeholder="例如 华东主仓" />
            </div>
            <TextField label="地址" name="address" placeholder="可选" />
            <div className="flex items-center gap-2">
              <input id="isDefault" name="isDefault" type="checkbox" className="size-4 rounded border-input" />
              <Label htmlFor="isDefault">设为默认仓库</Label>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}