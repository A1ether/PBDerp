import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchForm } from "@/components/shared/search-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listProducts } from "@/modules/products/queries";

export const metadata = { title: "商品" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organizationId, role } = await requirePermission("products.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams, { sort: "createdAt" });
  const { items, total } = await listProducts(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "products.write");

  return (
    <div>
      <PageHeader
        title="商品"
        description="管理 SPU、SKU、价格与补货点。库存以 SKU 为单位流转。"
        actions={
          canWrite ? (
            <Link href="/products/new" className={buttonVariants()}>
              <Plus className="size-4" />
              新建商品
            </Link>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchForm action="/products" params={rawParams} placeholder="搜索商品名称、编码、SKU、条码" />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={params.q ? "没有匹配的商品" : "还没有商品"}
          description={params.q ? "换个关键词试试。" : "先创建第一个商品和 SKU，销售/采购订单才能引用。"}
          action={
            canWrite ? (
              <Link href="/products/new" className={buttonVariants({ size: "sm" })}>
                新建商品
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>类目</TableHead>
                <TableHead>品牌</TableHead>
                <TableHead className="text-right">SKU 数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link href={`/products/${product.id}`} className="font-medium hover:underline">
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.code}</TableCell>
                  <TableCell>{product.category?.name ?? "-"}</TableCell>
                  <TableCell>{product.brand?.name ?? "-"}</TableCell>
                  <TableCell className="text-right">{product._count.variants}</TableCell>
                  <TableCell>
                    <StatusBadge status={product.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(product.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/products/${product.id}`} className="text-sm text-primary hover:underline">
                      查看
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/products" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}