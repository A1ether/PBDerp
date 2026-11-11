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
  approvePurchaseOrderAction,
  cancelPurchaseOrderAction,
  markPurchaseOrderOrderedAction,
  recordSupplierPaymentAction,
} from "@/modules/purchases/actions";
import { getPurchaseOrder } from "@/modules/purchases/queries";

export const metadata = { title: "采购订单详情" };

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId, role } = await requirePermission("purchase.read");
  const order = await getPurchaseOrder(organizationId, id);
  if (!order) notFound();

  const canWrite = can(role, "purchase.write");
  const canReceive = can(role, "purchase.receive");
  const canPay = can(role, "finance.write");

  return (
    <div>
      <PageHeader
        title={order.orderNo}
        description={`${order.supplier.name} · ${order.warehouse.name}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
            {canWrite && order.status === "DRAFT" ? (
              <ActionButtonForm action={approvePurchaseOrderAction} fields={{ id: order.id }} label="审批通过" />
            ) : null}
            {canWrite && order.status === "APPROVED" ? (
              <ActionButtonForm action={markPurchaseOrderOrderedAction} fields={{ id: order.id }} label="标记已下单" variant="outline" />
            ) : null}
            {canReceive && ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"].includes(order.status) ? (
              <Link href={`/purchases/${order.id}/receive`} className={buttonVariants()}>
                收货入库
              </Link>
            ) : null}
            {canWrite && ["DRAFT", "APPROVED", "ORDERED"].includes(order.status) ? (
              <ActionButtonForm
                action={cancelPurchaseOrderAction}
                fields={{ id: order.id }}
                label="取消"
                variant="destructive"
                confirmMessage="确定取消该采购订单？"
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
                  <TableHead className="text-right">采购数量</TableHead>
                  <TableHead className="text-right">已收</TableHead>
                  <TableHead className="text-right">成本</TableHead>
                  <TableHead className="text-right">税率</TableHead>
                  <TableHead className="text-right">小计</TableHead>
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
                    <TableCell className="text-right">{formatQuantity(line.receivedQuantity)}</TableCell>
                    <TableCell className="text-right">{formatMoney(line.unitCost)}</TableCell>
                    <TableCell className="text-right">{(Number(line.taxRate.toString()) * 100).toFixed(2)}%</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(line.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex flex-col items-end gap-1 text-sm">
              <div className="flex w-56 justify-between text-muted-foreground"><span>商品小计</span><span>{formatMoney(order.subtotal)}</span></div>
              <div className="flex w-56 justify-between text-muted-foreground"><span>税额</span><span>{formatMoney(order.taxTotal)}</span></div>
              <div className="flex w-56 justify-between border-t pt-1 font-semibold"><span>合计</span><span>{formatMoney(order.grandTotal)}</span></div>
              <div className="flex w-56 justify-between text-muted-foreground"><span>已付款</span><span>{formatMoney(order.paidAmount)}</span></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>采购信息</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="供应商" value={`${order.supplier.name} (${order.supplier.code})`} />
              <Info label="收货仓库" value={order.warehouse.name} />
              <Info label="预计到货" value={formatDateTime(order.expectedAt)} />
              <Info label="审批时间" value={formatDateTime(order.approvedAt)} />
              <Info label="收货时间" value={formatDateTime(order.receivedAt)} />
              <Info label="创建人" value={order.createdBy?.name ?? "-"} />
              <Info label="备注" value={order.note ?? "-"} />
            </CardContent>
          </Card>

          {canPay && order.status !== "CANCELLED" ? (
            <Card>
              <CardHeader><CardTitle>登记付款</CardTitle></CardHeader>
              <CardContent>
                <ActionForm action={recordSupplierPaymentAction} submitLabel="确认付款" className="space-y-3">
                  <input type="hidden" name="id" value={order.id} />
                  <TextField label="付款金额" name="amount" type="number" step="0.01" min="0" required />
                  <NativeSelect
                    label="付款方式"
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
                  <TextField label="付款日期" name="paidAt" type="date" />
                  <TextAreaField label="备注" name="note" rows={2} />
                </ActionForm>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>收货记录</CardTitle></CardHeader>
          <CardContent>
            {order.receipts.length === 0 ? <p className="text-sm text-muted-foreground">尚未收货。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>收货单号</TableHead><TableHead>时间</TableHead><TableHead className="text-right">行数</TableHead></TableRow></TableHeader>
                <TableBody>
                  {order.receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-xs">{receipt.receiptNo}</TableCell>
                      <TableCell>{formatDateTime(receipt.receivedAt)}</TableCell>
                      <TableCell className="text-right">{receipt.lines.length}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>付款记录</CardTitle></CardHeader>
          <CardContent>
            {order.payments.length === 0 ? <p className="text-sm text-muted-foreground">尚无付款。</p> : (
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