import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { createProductAction } from "@/modules/products/actions";
import { listBrandOptions, listCategoryOptions, listUnitOptions } from "@/modules/products/queries";

export const metadata = { title: "新建商品" };

export default async function NewProductPage() {
  const { organizationId } = await requirePermission("products.write");
  const [categories, brands, units] = await Promise.all([
    listCategoryOptions(organizationId),
    listBrandOptions(organizationId),
    listUnitOptions(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="新建商品"
        description="创建 SPU 与首个 SKU。后续可以继续添加多规格 SKU。"
      />

      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createProductAction}
            submitLabel="创建商品"
            cancel={
              <Link href="/products" className={buttonVariants({ variant: "outline" })}>
                取消
              </Link>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="商品编码" name="code" required placeholder="例如 P-1001" />
              <TextField label="商品名称" name="name" required placeholder="例如 经典圆领 T 恤" />
              <NativeSelect
                label="类目"
                name="categoryId"
                options={categories.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
                placeholder="未分类"
              />
              <NativeSelect
                label="品牌"
                name="brandId"
                options={brands.map((item) => ({ value: item.id, label: item.name }))}
                placeholder="无品牌"
              />
              <NativeSelect
                label="单位"
                name="unitId"
                options={units.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
                placeholder="未设置"
              />
              <TextField label="图片地址" name="imageUrl" placeholder="https://..." />
            </div>

            <div className="rounded-lg border p-4">
              <h2 className="mb-4 text-sm font-semibold">首个 SKU</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="SKU" name="sku" required placeholder="例如 P-1001-BLK-M" />
                <TextField label="条码" name="barcode" placeholder="可选" />
                <TextField
                  label="规格名称"
                  name="variantName"
                  placeholder="例如 黑色 / M；留空则使用商品名称"
                />
                <div className="hidden md:block" />
                <TextField label="采购价" name="purchasePrice" type="number" step="0.01" min="0" defaultValue="0" />
                <TextField label="销售价" name="salePrice" type="number" step="0.01" min="0" defaultValue="0" />
                <TextField
                  label="补货点"
                  name="reorderPoint"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  hint="可用库存低于该值时进入低库存列表。"
                />
              </div>
            </div>

            <TextAreaField label="商品描述" name="description" placeholder="可选" rows={4} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}