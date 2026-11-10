import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { buttonVariants } from "@/lib/button-variants";
import type { Customer } from "@/generated/prisma/client";
import { createCustomerAction, updateCustomerAction } from "@/modules/partners/actions";

export function CustomerForm({ customer }: { customer?: Customer }) {
  const editing = Boolean(customer);

  return (
    <ActionForm
      action={editing ? updateCustomerAction : createCustomerAction}
      submitLabel={editing ? "保存修改" : "创建客户"}
      cancel={
        <Link href="/partners/customers" className={buttonVariants({ variant: "outline" })}>
          取消
        </Link>
      }
    >
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="客户编码" name="code" required defaultValue={customer?.code} placeholder="例如 C-0001" />
        <TextField label="客户名称" name="name" required defaultValue={customer?.name} />
        <TextField label="联系人" name="contact" defaultValue={customer?.contact} />
        <TextField label="电话" name="phone" defaultValue={customer?.phone} />
        <TextField label="邮箱" name="email" type="email" defaultValue={customer?.email} />
        <TextField label="税号" name="taxNo" defaultValue={customer?.taxNo} />
        <TextField
          label="信用额度"
          name="creditLimit"
          type="number"
          step="0.01"
          min="0"
          defaultValue={customer?.creditLimit.toString() ?? "0"}
        />
        {customer ? (
          <NativeSelect
            label="状态"
            name="status"
            defaultValue={customer.status}
            options={[
              { value: "ACTIVE", label: "启用" },
              { value: "INACTIVE", label: "停用" },
            ]}
          />
        ) : null}
      </div>
      <TextAreaField label="地址" name="address" defaultValue={customer?.address} rows={3} />
    </ActionForm>
  );
}