import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { ActionForm } from "@/components/shared/action-form";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatQuantity } from "@/lib/format";
import { sum } from "@/lib/money";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { archiveProductAction, createVariantAction } from "@/modules/products/actions";
import { getProduct } from "@/modules/products/queries";

export const metadata = { title: "商品详情" };

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("products.read");
  const product = await getProduct(organizationId, id);

  if (!product) notFound();
  const canWrite = can(role, "products.write");

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.code} · ${product.category?.name ?? "未分类"} · ${product.brand?.name ?? "无品牌"}`}
        actions={
          <>
            <StatusBadge status={product.status} />
            {canWrite ? (
              <>
                <Link href={`/products/${product.id}/edit`} className={buttonVariants({ variant: "outline" })}>
                  <Pencil className="size-4" />
                  编辑
                </Link>
                <ConfirmSubmitButton
                  action={archiveProductAction}
                  confirmMessage={`确定归档商品「${product.name}」吗？归档后不能再用于新订单。`}
                >
                  归档
                </ConfirmSubmitButton>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>SKU 列表</CardTitle>
          </CardHeader>
          <CardContent>
            {product.variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无 SKU。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>条码</TableHead>
                    <TableHead className="text-right">采购价</TableHead>
                    <TableHead className="text-right">销售价</TableHead>
                    <TableHead className="text-right">库存 / 可用</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map((variant) => {
                    const totalQuantity = sum(variant.stockLevels.map((level) => level.quantity));
                    const totalReserved = sum(variant.stockLevels.map((level) => level.reservedQuantity));
                    return (
                      <TableRow key={variant.id}>
                        <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                        <TableCell>{variant.name}</TableCell>
                        <TableCell className="font-mono text-xs">{variant.barcode ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatMoney(variant.purchasePrice)}</TableCell>
                        <TableCell className="text-right">{formatMoney(variant.salePrice)}</TableCell>
                        <TableCell className="text-right">
                          {formatQuantity(totalQuantity)} / {formatQuantity(totalQuantity.minus(totalReserved))}
                        </TableCell>
                        <TableCell className="text-right">
                          {canWrite ? (
                            <Link
                              href={`/products/${product.id}/variants/${variant.id}/edit`}
                              className="text-sm text-primary hover:underline"
                            >
                              编辑
                            </Link>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>商品信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="单位" value={product.unit?.name ?? "-"} />
            <Info label="状态" value={<StatusBadge status={product.status} />} />
            <Info label="创建时间" value={product.createdAt.toLocaleString("zh-CN")} />
            {product.description ? (
              <div>
                <p className="text-xs text-muted-foreground">描述</p>
                <p className="mt-1 whitespace-pre-wrap">{product.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              新增 SKU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createVariantAction} submitLabel="添加 SKU" className="max-w-3xl">
              <input type="hidden" name="productId" value={product.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="SKU" name="sku" required placeholder="例如 P-1001-WHT-L" />
                <TextField label="条码" name="barcode" placeholder="可选" />
                <TextField label="规格名称" name="name" required placeholder="例如 白色 / L" />
                <div className="hidden md:block" />
                <TextField label="采购价" name="purchasePrice" type="number" step="0.01" min="0" defaultValue="0" />
                <TextField label="销售价" name="salePrice" type="number" step="0.01" min="0" defaultValue="0" />
                <TextField label="补货点" name="reorderPoint" type="number" step="0.01" min="0" defaultValue="0" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}