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
import { formatMoney } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listCustomers } from "@/modules/partners/queries";

export const metadata = { title: "客户" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId, role } = await requirePermission("partners.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const { items, total } = await listCustomers(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "partners.write");

  return (
    <div>
      <PageHeader
        title="客户"
        description="销售订单的购买方。"
        actions={canWrite ? <Link href="/partners/customers/new" className={buttonVariants()}><Plus className="size-4" />新建客户</Link> : null}
      />
      <div className="mb-4"><SearchForm action="/partners/customers" params={rawParams} placeholder="搜索客户名称、编码、联系人、电话" /></div>

      {items.length === 0 ? (
        <EmptyState title={params.q ? "没有匹配的客户" : "还没有客户"} description="创建客户后即可开销售订单。" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead className="text-right">信用额度</TableHead>
                <TableHead className="text-right">订单数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="font-mono text-xs">{customer.code}</TableCell>
                  <TableCell>{customer.contact ?? "-"}</TableCell>
                  <TableCell>{customer.phone ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatMoney(customer.creditLimit)}</TableCell>
                  <TableCell className="text-right">{customer._count.salesOrders}</TableCell>
                  <TableCell><StatusBadge status={customer.status} /></TableCell>
                  <TableCell className="text-right">
                    {canWrite ? <Link href={`/partners/customers/${customer.id}/edit`} className="text-sm text-primary hover:underline">编辑</Link> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/partners/customers" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}