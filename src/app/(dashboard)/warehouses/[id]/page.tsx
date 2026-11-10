import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";

import { ActionForm } from "@/components/shared/action-form";
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
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { createLocationAction } from "@/modules/warehouses/actions";
import { getWarehouse } from "@/modules/warehouses/queries";

export const metadata = { title: "仓库详情" };

export default async function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("warehouse.read");
  const warehouse = await getWarehouse(organizationId, id);
  if (!warehouse) notFound();
  const canWrite = can(role, "warehouse.write");

  return (
    <div>
      <PageHeader
        title={warehouse.name}
        description={`${warehouse.code}${warehouse.isDefault ? " · 默认仓库" : ""}`}
        actions={
          <>
            <StatusBadge status={warehouse.status} />
            {canWrite ? (
              <Link href={`/warehouses/${warehouse.id}/edit`} className={buttonVariants({ variant: "outline" })}>
                <Pencil className="size-4" />
                编辑
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>库位</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>编码</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="text-right">库存记录</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouse.locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-mono text-xs">{location.code}</TableCell>
                    <TableCell>{location.name}</TableCell>
                    <TableCell className="text-right">{location._count.stockLevels}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>仓库信息</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">地址</span>
              <span className="text-right">{warehouse.address ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">创建时间</span>
              <span>{warehouse.createdAt.toLocaleString("zh-CN")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {canWrite ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="size-4" />
              新增库位
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createLocationAction} submitLabel="添加库位" className="max-w-2xl">
              <input type="hidden" name="warehouseId" value={warehouse.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="库位编码" name="code" required placeholder="例如 A-01" />
                <TextField label="库位名称" name="name" required placeholder="例如 A 区 01" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}