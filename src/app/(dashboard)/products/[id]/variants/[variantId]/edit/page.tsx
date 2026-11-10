import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { updateVariantAction } from "@/modules/products/actions";
import { getProduct } from "@/modules/products/queries";

export const metadata = { title: "编辑 SKU" };

export default async function EditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const { organizationId } = await requirePermission("products.write");
  const product = await getProduct(organizationId, id);
  const variant = product?.variants.find((item) => item.id === variantId);

  if (!product || !variant) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="编辑 SKU" description={`${product.name} · ${variant.sku}`} />

      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={updateVariantAction}
            submitLabel="保存修改"
            cancel={
              <Link href={`/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>
                取消
              </Link>
            }
          >
            <input type="hidden" name="id" value={variant.id} />
            <input type="hidden" name="productId" value={product.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="SKU" name="sku" defaultValue={variant.sku} className="opacity-60" hint="SKU 创建后不可修改。" />
              <TextField label="条码" name="barcode" defaultValue={variant.barcode} />
              <TextField label="规格名称" name="name" required defaultValue={variant.name} />
              <NativeSelect
                label="状态"
                name="status"
                defaultValue={variant.status}
                options={[
                  { value: "ACTIVE", label: "启用" },
                  { value: "INACTIVE", label: "停用" },
                ]}
              />
              <TextField label="采购价" name="purchasePrice" type="number" step="0.01" min="0" defaultValue={variant.purchasePrice.toString()} />
              <TextField label="销售价" name="salePrice" type="number" step="0.01" min="0" defaultValue={variant.salePrice.toString()} />
              <TextField label="补货点" name="reorderPoint" type="number" step="0.01" min="0" defaultValue={variant.reorderPoint.toString()} />
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}