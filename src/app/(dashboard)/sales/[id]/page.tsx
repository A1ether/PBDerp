import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButtonForm } from "@/components/shared/action-button-form";
import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextAreaField, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/lib/button-variants";
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
import {
  cancelSalesOrderAction,
  completeSalesOrderAction,
  confirmSalesOrderAction,
  recordSalesPaymentAction,
} from "@/modules/sales/actions";
import { getSalesOrder } from "@/modules/sales/queries";

export const metadata = { title: "销售订单详情" };

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("sales.read");
  const order = await getSalesOrder(organizationId, id);
  if (!order) notFound();

  const canWrite = can(role, "sales.write");
  const canShip = can(role, "sales.ship");
  const canPay = can(role, "finance.write");

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        description={`${order.customer.name} · ${order.warehouse.name} · ${formatDateTime(order.orderedAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
            {canWrite && order.status === "DRAFT" ? (
              <ActionButtonForm
                action={confirmSalesOrderAction}
                fields={{ id: order.id }}
                label="确认订单（预留库存）"
                confirmMessage="确认后会按可用库存预留商品，是否继续？"
              />
            ) : null}
            {canShip && (order.status === "CONFIRMED" || order.status === "PARTIALLY_SHIPPED") ? (
              <Link href={`/sales/${order.id}/ship`} className={buttonVariants()}>
                出库
              </Link>
            ) : null}
            {canWrite && order.status === "SHIPPED" ? (
              <ActionButtonForm action={completeSalesOrderAction} fields={{ id: order.id }} label="完成订单" variant="outline" />
            ) : null}
            {canWrite && ["SHIPPED", "COMPLETED", "PARTIALLY_SHIPPED"].includes(order.status) ? (
              <Link href={`/sales/${order.id}/return`} className={buttonVariants({ variant: "outline" })}>
                创建退货
              </Link>
            ) : null}
            {canWrite && (order.status === "DRAFT" || order.status === "CONFIRMED") ? (
              <ActionButtonForm
                action={cancelSalesOrderAction}
                fields={{ id: order.id }}
                label="取消订单"
                variant="destructive"
                confirmMessage={order.status === "CONFIRMED" ? "取消会释放已预留库存，是否继续？" : "确定取消该订单？"}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>商品明细</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU / 商品</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">单价</TableHead>
                  <TableHead className="text-right">折扣</TableHead>
                  <TableHead className="text-right">税率</TableHead>
                  <TableHead className="text-right">小计</TableHead>
                  <TableHead className="text-right">已出库</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="font-mono text-xs">{line.skuSnapshot}</div>
                      <div className="text-sm">{line.nameSnapshot}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                    <TableCell className="text-right">{formatMoney(line.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatMoney(line.discount)}</TableCell>
                    <TableCell className="text-right">{(Number(line.taxRate.toString()) * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(line.lineTotal)}</TableCell>
                    <TableCell className="text-right">{formatQuantity(line.shippedQuantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <TotalRow label="商品小计" value={order.subtotal} />
              <TotalRow label="折扣" value={order.discountTotal} negative />
              <TotalRow label="税额" value={order.taxTotal} />
              <TotalRow label="运费" value={order.shippingFee} />
              <div className="flex w-56 justify-between border-t pt-1 font-semibold">
                <span>合计</span><span>{formatMoney(order.grandTotal)}</span>
              </div>
              <div className="flex w-56 justify-between text-muted-foreground">
                <span>已收款</span><span>{formatMoney(order.paidAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>订单信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="客户" value={`${order.customer.name} (${order.customer.code})`} />
              <Info label="发货仓库" value={order.warehouse.name} />
              <Info label="下单时间" value={formatDateTime(order.orderedAt)} />
              <Info label="确认时间" value={formatDateTime(order.confirmedAt)} />
              <Info label="出库时间" value={formatDateTime(order.shippedAt)} />
              <Info label="创建人" value={order.createdBy?.name ?? "-"} />
              <Info label="备注" value={order.note ?? "-"} />
            </CardContent>
          </Card>

          {canPay && order.status !== "CANCELLED" ? (
            <Card>
              <CardHeader><CardTitle>登记收款</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={recordSalesPaymentAction} submitLabel="确认收款" className="space-y-3">
                  <input type="hidden" name="id" value={order.id} />
                  <TextField label="收款金额" name="amount" type="number" step="0.01" min="0" required />
                  <NativeSelect
                    label="收款方式"
                    name="method"
                    defaultValue="BANK_TRANSFER"
                    options={[
                      { value: "BANK_TRANSFER", label: "银行转账" },
                      { value: "CASH", label: "现金" },
                      { value: "ALIPAY", label: "支付宝" },
                      { value: "WECHAT", label: "微信" },
                      { value: "CARD", label: "刷卡" },
                      { value: "OTHER", label: "其他" },
                    ]}
                  />
                  <TextField label="收款日期" name="paidAt" type="date" />
                  <TextAreaField label="备注" name="note" rows={2} />
                </ActionForm>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>发货记录</CardTitle></CardHeader>
          <CardContent>
            {order.shipments.length === 0 ? <p className="text-sm text-muted-foreground">尚未出库。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>发货单号</TableHead><TableHead>时间</TableHead><TableHead className="text-right">行数</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.shipments.map((shipment) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-mono text-xs">{shipment.shipmentNo}</TableCell>
                      <TableCell>{formatDateTime(shipment.shippedAt)}</TableCell>
                      <TableCell className="text-right">{shipment.lines.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>收款记录</CardTitle></CardHeader>
          <CardContent>
            {order.payments.length === 0 ? <p className="text-sm text-muted-foreground">尚无收款。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>方式</TableHead><TableHead className="text-right">金额</TableHead><TableHead>操作人</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateTime(payment.paidAt)}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="text-right">{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.createdBy?.name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}

function TotalRow({ label, value, negative }: { label: string; value: Parameters<typeof formatMoney>[0]; negative?: boolean }) {
  return <div className="flex w-56 justify-between text-muted-foreground"><span>{label}</span><span>{negative ? "-" : ""}{formatMoney(value)}</span></div>;
}