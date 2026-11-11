import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButtonForm } from "@/components/shared/action-button-form";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { receiveSalesReturnAction } from "@/modules/returns/actions";
import { getSalesReturn } from "@/modules/returns/queries";

export const metadata = { title: "退货详情" };

const RETURN_LABELS: Record<string, string> = {
  DRAFT: "待入库",
  RECEIVED: "已入库",
  CANCELLED: "已取消",
};

export default async function SalesReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("sales.read");
  const salesReturn = await getSalesReturn(organizationId, id);
  if (!salesReturn) notFound();

  const canReceive = can(role, "inventory.write");

  return (
    <div>
      <PageHeader
        title={salesReturn.returnNo}
        description={`${salesReturn.order.orderNo} · ${salesReturn.order.customer.name} · ${salesReturn.warehouse.name}`}
        actions={
          <>
            <StatusBadge status={salesReturn.status} label={RETURN_LABELS[salesReturn.status]} />
            {canReceive && salesReturn.status === "DRAFT" ? (
              <ActionButtonForm
                action={receiveSalesReturnAction}
                fields={{ id: salesReturn.id }}
                label="确认退货入库"
                confirmMessage="确认后会增加实物库存并生成退款流水，是否继续？"
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>退货明细</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / 商品</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">小计</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesReturn.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{line.orderLine.skuSnapshot}</div>
                      <div className="text-sm">{line.orderLine.nameSnapshot}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                    <TableCell className="text-right">{formatMoney(line.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(line.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <div className="flex w-56 justify-between border-t pt-2 font-semibold">
                <span>退款金额</span><span>{formatMoney(salesReturn.refundAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>退货信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="销售订单" value={<Link href={`/sales/${salesReturn.orderId}`} className="text-primary hover:underline">{salesReturn.order.orderNo}</Link>} />
              <Info label="客户" value={salesReturn.order.customer.name} />
              <Info label="仓库" value={salesReturn.warehouse.name} />
              <Info label="状态" value={RETURN_LABELS[salesReturn.status]} />
              <Info label="创建人" value={salesReturn.createdBy?.name ?? "-"} />
              <Info label="创建时间" value={formatDateTime(salesReturn.createdAt)} />
              <Info label="入库时间" value={formatDateTime(salesReturn.receivedAt)} />
              <Info label="原因" value={salesReturn.reason ?? "-"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>退款流水</CardTitle></CardHeader>
            <CardContent>
              {salesReturn.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">确认入库后生成。</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {salesReturn.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{formatDateTime(payment.paidAt)}</span>
                      <span className="font-medium">{formatMoney(payment.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}