import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchForm } from "@/components/shared/search-form";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { requirePermission } from "@/lib/session";
import { listSalesReturns } from "@/modules/returns/queries";

export const metadata = { title: "退货" };

const RETURN_LABELS: Record<string, string> = {
  DRAFT: "待入库",
  RECEIVED: "已入库",
  CANCELLED: "已取消",
};

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId } = await requirePermission("sales.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const { items, total } = await listSalesReturns(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);

  return (
    <div>
      <PageHeader title="退货" description="从已出库订单创建退货单；确认入库后库存增加并生成退款流水。" />
      <div className="mb-4"><SearchForm action="/returns" params={rawParams} placeholder="搜索退货单号、订单号、客户" /></div>

      {items.length === 0 ? (
        <EmptyState title={params.q ? "没有匹配的退货单" : "还没有退货单"} description="在销售订单详情页点击「创建退货」。" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>退货单号</TableHead>
                <TableHead>销售订单</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>仓库</TableHead>
                <TableHead className="text-right">退款金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">明细</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Link href={`/returns/${item.id}`} className="font-mono text-xs font-medium hover:underline">{item.returnNo}</Link></TableCell>
                  <TableCell className="font-mono text-xs">{item.order.orderNo}</TableCell>
                  <TableCell>{item.order.customer.name}</TableCell>
                  <TableCell>{item.warehouse.name}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.refundAmount)}</TableCell>
                  <TableCell><StatusBadge status={item.status} label={RETURN_LABELS[item.status]} /></TableCell>
                  <TableCell className="text-right">{item._count.lines}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/returns" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}