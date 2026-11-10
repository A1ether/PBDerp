import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { buttonVariants } from "@/lib/button-variants";
import type { Supplier } from "@/generated/prisma/client";
import { createSupplierAction, updateSupplierAction } from "@/modules/partners/actions";

export function SupplierForm({ supplier }: { supplier?: Supplier }) {
  const editing = Boolean(supplier);

  return (
    <ActionForm
      action={editing ? updateSupplierAction : createSupplierAction}
      submitLabel={editing ? "保存修改" : "创建供应商"}
      cancel={
        <Link href="/partners/suppliers" className={buttonVariants({ variant: "outline" })}>
          取消
        </Link>
      }
    >
      {supplier ? <input type="hidden" name="id" value={supplier.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="供应商编码" name="code" required defaultValue={supplier?.code} placeholder="例如 S-0001" />
        <TextField label="供应商名称" name="name" required defaultValue={supplier?.name} />
        <TextField label="联系人" name="contact" defaultValue={supplier?.contact} />
        <TextField label="电话" name="phone" defaultValue={supplier?.phone} />
        <TextField label="邮箱" name="email" type="email" defaultValue={supplier?.email} />
        <TextField label="税号" name="taxNo" defaultValue={supplier?.taxNo} />
        {supplier ? (
          <NativeSelect
            label="状态"
            name="status"
            defaultValue={supplier.status}
            options={[
              { value: "ACTIVE", label: "启用" },
              { value: "INACTIVE", label: "停用" },
            ]}
          />
        ) : null}
      </div>
      <TextAreaField label="地址" name="address" defaultValue={supplier?.address} rows={3} />
    </ActionForm>
  );
}