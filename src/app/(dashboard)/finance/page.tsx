import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { purchaseSummary } from "@/modules/purchases/queries";
import { payables, receivables, recentPayments } from "@/modules/reporting/queries";
import { salesSummary } from "@/modules/sales/queries";

export const metadata = { title: "收付款" };

const METHOD_LABELS: Record<string, string> = {
  CASH: "现金",
  BANK_TRANSFER: "银行转账",
  ALIPAY: "支付宝",
  WECHAT: "微信",
  CARD: "刷卡",
  OTHER: "其他",
};

export default async function FinancePage() {
  const { organizationId } = await requirePermission("finance.read");
  const [payments, ar, ap, sales, purchases] = await Promise.all([
    recentPayments(organizationId, 30),
    receivables(organizationId),
    payables(organizationId),
    salesSummary(organizationId),
    purchaseSummary(organizationId),
  ]);

  return (
    <div>
      <PageHeader title="收付款" description="销售收款、采购付款与应收应付余额。" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="应收余额" value={formatMoney(sales.receivable)} hint={`${ar.length} 笔待收`} />
        <StatCard title="应付余额" value={formatMoney(purchases.payable)} hint={`${ap.length} 笔待付`} />
        <StatCard title="今日订单" value={sales.todayOrders} hint={formatMoney(sales.todaySales)} />
        <StatCard title="待收货采购单" value={purchases.pendingReceipt} hint="已审批/已下单" />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>最近收付款</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">暂无收付款记录。</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>方向</TableHead>
                  <TableHead>关联单据</TableHead>
                  <TableHead>方式</TableHead>
                  <TableHead className="text-right">金额</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>备注</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(payment.paidAt)}</TableCell>
                    <TableCell>
                      <span className={payment.direction === "IN" ? "text-emerald-600" : "text-rose-600"}>
                        {payment.direction === "IN" ? "收款" : "付款"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {payment.referenceType === "SALES_ORDER" ? "销售订单" : "采购订单"} · {payment.referenceId.slice(0, 8)}
                    </TableCell>
                    <TableCell>{METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                    <TableCell className={`text-right font-medium ${payment.direction === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                      {payment.direction === "IN" ? "+" : "-"}{formatMoney(payment.amount)}
                    </TableCell>
                    <TableCell>{payment.createdBy?.name ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.note ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>应收明细</CardTitle></CardHeader>
          <CardContent>
            {ar.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有未收款项。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>客户</TableHead><TableHead className="text-right">余额</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ar.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(order.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>应付明细</CardTitle></CardHeader>
          <CardContent>
            {ap.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有未付款项。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>采购单号</TableHead><TableHead>供应商</TableHead><TableHead className="text-right">余额</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ap.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                      <TableCell>{order.supplier.name}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(order.balance)}</TableCell>
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