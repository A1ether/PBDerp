import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { requirePermission } from "@/lib/session";
import { listMovements } from "@/modules/inventory/queries";
import { listWarehouseOptions } from "@/modules/warehouses/queries";
import type { StockMovementType } from "@/generated/prisma/client";

export const metadata = { title: "库存流水" };

const TYPE_LABELS: Record<string, string> = {
  INITIAL: "期初",
  PURCHASE_RECEIPT: "采购入库",
  SALES_SHIPMENT: "销售出库",
  TRANSFER_IN: "调拨入库",
  TRANSFER_OUT: "调拨出库",
  ADJUSTMENT: "手工调整",
  RETURN_IN: "退货入库",
  RETURN_OUT: "退货出库",
};

export default async function MovementsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId } = await requirePermission("inventory.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const warehouseId = typeof rawParams.warehouseId === "string" ? rawParams.warehouseId : "";
  const type = typeof rawParams.type === "string" ? (rawParams.type as StockMovementType) : undefined;
  const warehouses = await listWarehouseOptions(organizationId);
  const { items, total } = await listMovements(organizationId, { q: params.q, warehouseId, type }, params);
  const meta = pageMeta(total, params.page, params.pageSize);

  return (
    <div>
      <PageHeader title="库存流水" description="只追加的库存变动记录；余额表可随时由流水核对。" />

      <form method="get" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input name="q" defaultValue={params.q} placeholder="搜索 SKU、商品、单据号" className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm sm:max-w-xs dark:bg-input/30" />
        <select name="warehouseId" defaultValue={warehouseId} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
          <option value="">全部仓库</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
        <select name="type" defaultValue={type ?? ""} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
          <option value="">全部类型</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted">筛选</button>
      </form>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>仓库 / 库位</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">变动后余额</TableHead>
              <TableHead>单据</TableHead>
              <TableHead>操作人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(movement.createdAt)}</TableCell>
                <TableCell>{TYPE_LABELS[movement.type] ?? movement.type}</TableCell>
                <TableCell>
                  <div className="font-mono text-xs">{movement.variant.sku}</div>
                  <div className="text-xs text-muted-foreground">{movement.variant.product.name}</div>
                </TableCell>
                <TableCell>{movement.warehouse.name} / {movement.location.code}</TableCell>
                <TableCell className={`text-right font-medium ${movement.quantity.isNegative() ? "text-rose-600" : "text-emerald-600"}`}>
                  {movement.quantity.isNegative() ? "" : "+"}{formatQuantity(movement.quantity)}
                </TableCell>
                <TableCell className="text-right">{formatQuantity(movement.balanceAfter)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{movement.referenceType ?? "-"} {movement.referenceId ? `· ${movement.referenceId.slice(0, 8)}` : ""}</TableCell>
                <TableCell className="text-sm">{movement.createdBy?.name ?? "系统"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">暂无流水。</p> : null}
        <Pagination basePath="/inventory/movements" meta={meta} params={rawParams} />
      </div>
    </div>
  );
}