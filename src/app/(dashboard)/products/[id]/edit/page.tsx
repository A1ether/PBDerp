import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { updateProductAction } from "@/modules/products/actions";
import { getProduct, listBrandOptions, listCategoryOptions, listUnitOptions } from "@/modules/products/queries";

export const metadata = { title: "编辑商品" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("products.write");
  const [product, categories, brands, units] = await Promise.all([
    getProduct(organizationId, id),
    listCategoryOptions(organizationId),
    listBrandOptions(organizationId),
    listUnitOptions(organizationId),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="编辑商品" description={`${product.name} · ${product.code}`} />

      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={updateProductAction}
            submitLabel="保存修改"
            cancel={
              <Link href={`/products/${product.id}`} className={buttonVariants({ variant: "outline" })}>
                取消
              </Link>
            }
          >
            <input type="hidden" name="id" value={product.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="商品编码" name="code" required defaultValue={product.code} />
              <TextField label="商品名称" name="name" required defaultValue={product.name} />
              <NativeSelect
                label="类目"
                name="categoryId"
                defaultValue={product.categoryId}
                options={categories.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
                placeholder="未分类"
              />
              <NativeSelect
                label="品牌"
                name="brandId"
                defaultValue={product.brandId}
                options={brands.map((item) => ({ value: item.id, label: item.name }))}
                placeholder="无品牌"
              />
              <NativeSelect
                label="单位"
                name="unitId"
                defaultValue={product.unitId}
                options={units.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))}
                placeholder="未设置"
              />
              <TextField label="图片地址" name="imageUrl" defaultValue={product.imageUrl} />
            </div>
            <TextAreaField label="商品描述" name="description" defaultValue={product.description} rows={4} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}