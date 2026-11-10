import { PageHeader } from "@/components/shared/page-header";
import { SalesTrendChart } from "@/components/shared/sales-trend-chart";
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
import { formatMoney, formatQuantity } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { payables, receivables, salesTrend, topProducts } from "@/modules/reporting/queries";
import { purchaseSummary } from "@/modules/purchases/queries";
import { salesSummary } from "@/modules/sales/queries";

export const metadata = { title: "报表" };

export default async function ReportsPage() {
  const { organizationId } = await requirePermission("dashboard.read");
  const [trend, top, ar, ap, sales, purchases] = await Promise.all([
    salesTrend(organizationId, 30),
    topProducts(organizationId, 8),
    receivables(organizationId, 10),
    payables(organizationId, 10),
    salesSummary(organizationId),
    purchaseSummary(organizationId),
  ]);

  return (
    <div>
      <PageHeader title="报表" description="销售趋势、畅销 SKU、应收与应付。" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="订单总数" value={sales.orderCount} hint="不含已取消" />
        <StatCard title="待出库" value={sales.pendingShipment} hint="已确认订单" />
        <StatCard title="应收余额" value={formatMoney(sales.receivable)} hint="销售订单未收款" />
        <StatCard title="应付余额" value={formatMoney(purchases.payable)} hint="采购订单未付款" />
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>最近 30 天销售趋势</CardTitle></CardHeader>
        <CardContent><SalesTrendChart data={trend} /></CardContent>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>畅销 SKU</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">暂无销售数据。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>SKU / 商品</TableHead><TableHead className="text-right">销量</TableHead><TableHead className="text-right">销售额</TableHead></TableRow></TableHeader>
                <TableBody>
                  {top.map((item) => (
                    <TableRow key={`${item.sku}-${item.name}`}>
                      <TableCell><div className="font-mono text-xs">{item.sku}</div><div className="text-xs text-muted-foreground">{item.name}</div></TableCell>
                      <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>应收明细</CardTitle></CardHeader>
          <CardContent>
            {ar.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有未收款项。</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>订单号</TableHead><TableHead>客户</TableHead><TableHead className="text-right">应收</TableHead></TableRow></TableHeader>
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
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>应付明细</CardTitle></CardHeader>
        <CardContent>
          {ap.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">没有未付款项。</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>采购单号</TableHead><TableHead>供应商</TableHead><TableHead>状态</TableHead><TableHead className="text-right">应付</TableHead></TableRow></TableHeader>
              <TableBody>
                {ap.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderNo}</TableCell>
                    <TableCell>{order.supplier.name}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(order.balance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}