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
import { listStockTakes } from "@/modules/inventory/stocktake-queries";

export const metadata = { title: "库存盘点" };

const LABELS: Record<string, string> = {
  DRAFT: "盘点中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function StockTakePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId, role } = await requirePermission("inventory.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const { items, total } = await listStockTakes(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "inventory.write");

  return (
    <div>
      <PageHeader
        title="库存盘点"
        description="按仓库快照库存数量，录入实盘数并生成差异调整流水。"
        actions={canWrite ? <Link href="/inventory/stocktake/new" className={buttonVariants()}><Plus className="size-4" />新建盘点</Link> : null}
      />
      <div className="mb-4"><SearchForm action="/inventory/stocktake" params={rawParams} placeholder="搜索盘点单号、仓库" /></div>

      {items.length === 0 ? (
        <EmptyState title={params.q ? "没有匹配的盘点单" : "还没有盘点单"} description="创建盘点单后录入实盘数量。" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>盘点单号</TableHead>
                <TableHead>仓库</TableHead>
                <TableHead className="text-right">行数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Link href={`/inventory/stocktake/${item.id}`} className="font-mono text-xs font-medium hover:underline">{item.takeNo}</Link></TableCell>
                  <TableCell>{item.warehouse.name}</TableCell>
                  <TableCell className="text-right">{item._count.lines}</TableCell>
                  <TableCell><StatusBadge status={item.status} label={LABELS[item.status]} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right"><Link href={`/inventory/stocktake/${item.id}`} className="text-sm text-primary hover:underline">查看</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/inventory/stocktake" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}