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
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listSuppliers } from "@/modules/partners/queries";

export const metadata = { title: "供应商" };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId, role } = await requirePermission("partners.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const { items, total } = await listSuppliers(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);
  const canWrite = can(role, "partners.write");

  return (
    <div>
      <PageHeader
        title="供应商"
        description="采购订单的供货方。"
        actions={canWrite ? <Link href="/partners/suppliers/new" className={buttonVariants()}><Plus className="size-4" />新建供应商</Link> : null}
      />
      <div className="mb-4"><SearchForm action="/partners/suppliers" params={rawParams} placeholder="搜索供应商名称、编码、联系人、电话" /></div>

      {items.length === 0 ? (
        <EmptyState title={params.q ? "没有匹配的供应商" : "还没有供应商"} description="创建供应商后即可开采购订单。" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>供应商</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead className="text-right">采购单数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="font-mono text-xs">{supplier.code}</TableCell>
                  <TableCell>{supplier.contact ?? "-"}</TableCell>
                  <TableCell>{supplier.phone ?? "-"}</TableCell>
                  <TableCell className="text-right">{supplier._count.purchaseOrders}</TableCell>
                  <TableCell><StatusBadge status={supplier.status} /></TableCell>
                  <TableCell className="text-right">
                    {canWrite ? <Link href={`/partners/suppliers/${supplier.id}/edit`} className="text-sm text-primary hover:underline">编辑</Link> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination basePath="/partners/suppliers" meta={meta} params={rawParams} />
        </div>
      )}
    </div>
  );
}