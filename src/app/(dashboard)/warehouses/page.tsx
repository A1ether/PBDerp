import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
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
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listWarehouses } from "@/modules/warehouses/queries";

export const metadata = { title: "仓库" };

export default async function WarehousesPage() {
  const { organizationId, role } = await requirePermission("warehouse.read");
  const warehouses = await listWarehouses(organizationId);
  const canWrite = can(role, "warehouse.write");

  return (
    <div>
      <PageHeader
        title="仓库与库位"
        description="库存按仓库 + 库位 + SKU 记账；新建仓库会自动创建默认库位。"
        actions={
          canWrite ? (
            <Link href="/warehouses/new" className={buttonVariants()}>
              <Plus className="size-4" />
              新建仓库
            </Link>
          ) : null
        }
      />

      {warehouses.length === 0 ? (
        <EmptyState
          title="还没有仓库"
          description="先创建仓库，采购收货和销售出库才有落点。"
          action={canWrite ? <Link href="/warehouses/new" className={buttonVariants({ size: "sm" })}>新建仓库</Link> : null}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>仓库</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>地址</TableHead>
                <TableHead className="text-right">库位</TableHead>
                <TableHead className="text-right">库存记录</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell>
                    <Link href={`/warehouses/${warehouse.id}`} className="font-medium hover:underline">
                      {warehouse.name}
                    </Link>
                    {warehouse.isDefault ? <span className="ml-2 text-xs text-primary">默认</span> : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{warehouse.code}</TableCell>
                  <TableCell className="text-muted-foreground">{warehouse.address ?? "-"}</TableCell>
                  <TableCell className="text-right">{warehouse._count.locations}</TableCell>
                  <TableCell className="text-right">{warehouse._count.stockLevels}</TableCell>
                  <TableCell><StatusBadge status={warehouse.status} /></TableCell>
                  <TableCell className="text-right">
                    <Link href={`/warehouses/${warehouse.id}`} className="text-sm text-primary hover:underline">
                      查看
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}