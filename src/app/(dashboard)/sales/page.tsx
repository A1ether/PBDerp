import Link from "next/link";
import { Download, Plus } from "lucide-react";

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
import type { SalesOrderStatus } from "@/generated/prisma/client";
import { formatDate, formatMoney } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listSalesOrders } from "@/modules/sales/queries";

export const metadata = { title: "销售订单" };

const STATUSES: { value: SalesOrderStatus; label: string }[] = [
  { value: "DRAFT", label: "草稿" },
  { value: "CONFIRMED", label: "已确认" },
  { value: "PARTIALLY_SHIPPED", label: "部分出库" },
  { value: "SHIPPED", label: "已出库" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId, role } = await requirePermission("sales.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const status = typeof rawParams.status === "string" ? (rawParams.status as SalesOrderStatus) : undefined;
  const { items, total } = await listSalesOrders(organizationId, params, status);
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "sales.write");

  return (
    <div>
      <PageHeader
        title="销售订单"
        description="确认订单会预留库存；出库后扣减实物库存并生成发货单。"
        actions={
          <>
            <a href="/api/export/sales-orders" className={buttonVariants({ variant: "outline" })}>
              <Download className="size-4" />导出 CSV
            </a>
            {canWrite ? <Link href="/sales/new" className={buttonVariants()}><Plus className="size-4" />新建销售订单</Link> : null}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchForm action="/sales" params={rawParams} placeholder="搜索订单号、客户名称/编码" />
        <form method="get" className="flex items-center gap-2">
          {typeof rawParams.q === "string" ? <input type="hidden" name="q" value={rawParams.q} /> : null}
          <select name="status" defaultValue={status ?? ""} className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30">
            <option value="">全部状态</option>
            {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>筛选</button>
        </form>
      </div>

      {items.length === 0 ? (
        <EmptyState title={params.q || status ? "没有匹配的销售订单" : "还没有销售订单"} description="创建订单并确认，库存会进入预留状态。" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>仓库</TableHead>
                <TableHead className="text-right">行数</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>付款</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>下单时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell><Link href={`/sales/${order.id}`} className="font-mono text-xs font-medium hover:underline">{order.orderNo}</Link></TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>{order.warehouse.name}</TableCell>
                  <TableCell className="text-right">{order._count.lines}</TableCell>
                  <TableCell className="text-right">{formatMoney(order.grandTotal)}</TableCell>
                  <TableCell><StatusBadge status={order.paymentStatus} /></TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(order.orderedAt)}</TableCell>
                  <TableCell className="text-right"><Link href={`/sales/${order.id}`} className="text-sm text-primary hover:underline">查看</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/sales" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}