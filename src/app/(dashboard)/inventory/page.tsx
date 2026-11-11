import Link from "next/link";
import { ArrowLeftRight, ClipboardCheck, ClipboardList, Download, Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { buttonVariants } from "@/lib/button-variants";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuantity } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listStockLevels } from "@/modules/inventory/queries";
import { listWarehouseOptions } from "@/modules/warehouses/queries";

export const metadata = { title: "库存" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId, role } = await requirePermission("inventory.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const warehouseId = typeof rawParams.warehouseId === "string" ? rawParams.warehouseId : "";
  const lowStock = rawParams.lowStock === "1";
  const warehouses = await listWarehouseOptions(organizationId);
  const { items, total } = await listStockLevels(
    organizationId,
    { q: params.q, warehouseId, lowStock },
    params,
  );
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "inventory.write");
  const canTransfer = can(role, "inventory.transfer");

  return (
    <div>
      <PageHeader
        title="库存"
        description="库存按仓库 + 库位 + SKU 记账；可用量 = 实物数量 - 已预留。"
        actions={
          <>
            <Link href="/inventory/movements" className={buttonVariants({ variant: "outline" })}>
              <ClipboardList className="size-4" />
              库存流水
            </Link>
            <Link href="/inventory/stocktake" className={buttonVariants({ variant: "outline" })}>
              <ClipboardCheck className="size-4" />
              盘点
            </Link>
            <a href="/api/export/inventory" className={buttonVariants({ variant: "outline" })}>
              <Download className="size-4" />
              导出 CSV
            </a>
            {canTransfer ? (
              <Link href="/inventory/transfer" className={buttonVariants({ variant: "outline" })}>
                <ArrowLeftRight className="size-4" />
                仓库调拨
              </Link>
            ) : null}
            {canWrite ? (
              <Link href="/inventory/adjust" className={buttonVariants()}>
                <Plus className="size-4" />
                调整库存
              </Link>
            ) : null}
          </>
        }
      />

      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input name="q" defaultValue={params.q} placeholder="搜索 SKU、商品名称" className="sm:max-w-xs" />
        <select
          name="warehouseId"
          defaultValue={warehouseId}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          <option value="">全部仓库</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="lowStock" value="1" defaultChecked={lowStock} className="size-4 rounded border-input" />
          只看低库存
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
          筛选
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title={params.q || warehouseId || lowStock ? "没有匹配的库存记录" : "还没有库存"}
          description="采购收货或手工入库后，这里会出现库存。"
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU / 商品</TableHead>
                <TableHead>仓库 / 库位</TableHead>
                <TableHead className="text-right">实物数量</TableHead>
                <TableHead className="text-right">已预留</TableHead>
                <TableHead className="text-right">可用</TableHead>
                <TableHead className="text-right">补货点</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((level) => {
                const available = level.quantity.minus(level.reservedQuantity);
                const isLow = level.variant.reorderPoint.gt(0) && available.lte(level.variant.reorderPoint);
                return (
                  <TableRow key={level.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{level.variant.sku}</div>
                      <div className="text-sm">{level.variant.product.name} · {level.variant.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{level.warehouse.name}</div>
                      <div className="text-xs text-muted-foreground">{level.location.code} · {level.location.name}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(level.quantity)}</TableCell>
                    <TableCell className="text-right">{formatQuantity(level.reservedQuantity)}</TableCell>
                    <TableCell className="text-right font-medium">{formatQuantity(available)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatQuantity(level.variant.reorderPoint)}</TableCell>
                    <TableCell>
                      {isLow ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">低库存</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">正常</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination basePath="/inventory" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}