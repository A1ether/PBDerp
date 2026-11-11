import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { completeStockTakeAction } from "@/modules/inventory/actions";
import { getStockTake } from "@/modules/inventory/stocktake-queries";

export const metadata = { title: "盘点详情" };

const LABELS: Record<string, string> = {
  DRAFT: "盘点中",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function StockTakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("inventory.read");
  const stockTake = await getStockTake(organizationId, id);
  if (!stockTake) notFound();

  const canWrite = can(role, "inventory.write");
  const editing = stockTake.status === "DRAFT" && canWrite;

  return (
    <div>
      <PageHeader
        title={stockTake.takeNo}
        description={`${stockTake.warehouse.name} · 创建人 ${stockTake.createdBy?.name ?? "-"}`}
        actions={<StatusBadge status={stockTake.status} label={LABELS[stockTake.status]} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>盘点明细</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <ActionForm
                action={completeStockTakeAction}
                submitLabel="完成盘点并调整库存"
                cancel={<Link href="/inventory/stocktake" className={buttonVariants({ variant: "outline" })}>取消</Link>}
              >
                <input type="hidden" name="id" value={stockTake.id} />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU / 商品</TableHead>
                      <TableHead>库位</TableHead>
                      <TableHead className="text-right">账面数量</TableHead>
                      <TableHead className="w-36 text-right">实盘数量</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockTake.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{line.variant.sku}</div>
                          <div className="text-sm">{line.variant.product.name} · {line.variant.name}</div>
                        </TableCell>
                        <TableCell>{line.location.code}</TableCell>
                        <TableCell className="text-right">{formatQuantity(line.systemQuantity)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            name={`counted_${line.id}`}
                            type="number"
                            min="0"
                            step="0.0001"
                            defaultValue={line.systemQuantity.toString()}
                            className="h-8 w-28 text-right"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground">
                  完成时按实盘数写入库存，并生成 ADJUSTMENT 流水；实盘数不能低于已预留数量。
                </p>
              </ActionForm>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / 商品</TableHead>
                    <TableHead>库位</TableHead>
                    <TableHead className="text-right">账面</TableHead>
                    <TableHead className="text-right">实盘</TableHead>
                    <TableHead className="text-right">差异</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockTake.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{line.variant.sku}</div>
                        <div className="text-sm">{line.variant.product.name} · {line.variant.name}</div>
                      </TableCell>
                      <TableCell>{line.location.code}</TableCell>
                      <TableCell className="text-right">{formatQuantity(line.systemQuantity)}</TableCell>
                      <TableCell className="text-right">{formatQuantity(line.countedQuantity)}</TableCell>
                      <TableCell className={`text-right ${line.difference.isNegative() ? "text-rose-600" : line.difference.isPositive() ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {line.difference.isPositive() ? "+" : ""}{formatQuantity(line.difference)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>盘点信息</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="仓库" value={stockTake.warehouse.name} />
            <Info label="状态" value={LABELS[stockTake.status]} />
            <Info label="创建时间" value={formatDateTime(stockTake.createdAt)} />
            <Info label="完成时间" value={formatDateTime(stockTake.completedAt)} />
            <Info label="备注" value={stockTake.note ?? "-"} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}