import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, ShoppingCart, Truck, Wallet } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { SalesTrendChart } from "@/components/shared/sales-trend-chart";
import { StatCard } from "@/components/shared/stat-card";
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
import { formatDate, formatMoney, formatQuantity } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { dashboardData } from "@/modules/reporting/queries";

export const metadata = { title: "仪表盘" };

export default async function DashboardPage() {
  const { organizationId } = await requirePermission("dashboard.read");
  const data = await dashboardData(organizationId);

  return (
    <div>
      <PageHeader
        title="仪表盘"
        description="今日销售、待履约、库存风险与应收应付一屏掌握。"
        actions={
          <Link href="/sales/new" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            新建销售订单 <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="今日销售额"
          value={formatMoney(data.sales.todaySales)}
          hint={`${data.sales.todayOrders} 笔订单`}
          icon={<ShoppingCart className="size-4" />}
        />
        <StatCard
          title="待出库"
          value={data.sales.pendingShipment}
          hint="已确认、等待出库的订单"
          icon={<Truck className="size-4" />}
        />
        <StatCard
          title="低库存 SKU"
          value={data.lowStock}
          hint="可用量低于补货点的库存记录"
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          title="库存价值"
          value={formatMoney(data.stockValue)}
          hint="按 SKU 采购价估算"
          icon={<Boxes className="size-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>最近 7 天销售趋势</CardTitle></CardHeader>
          <CardContent><SalesTrendChart data={data.trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>应收 / 应付</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" /> 应收</div>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(data.sales.receivable)}</p>
              <p className="mt-1 text-xs text-muted-foreground">未收款销售订单余额</p>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Truck className="size-4" /> 应付</div>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(data.purchases.payable)}</p>
              <p className="mt-1 text-xs text-muted-foreground">未付款采购订单余额</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">待收货采购单</span>
              <span className="font-medium">{data.purchases.pendingReceipt}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近订单</CardTitle>
            <Link href="/sales" className="text-sm text-primary hover:underline">查看全部</Link>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">还没有销售订单。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead className="text-right">金额</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>日期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell><Link href={`/sales/${order.id}`} className="font-mono text-xs hover:underline">{order.orderNo}</Link></TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell className="text-right">{formatMoney(order.grandTotal)}</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(order.orderedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>低库存预警</CardTitle>
            <Link href="/inventory?lowStock=1" className="text-sm text-primary hover:underline">查看全部</Link>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">库存健康，暂无预警。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>仓库</TableHead>
                    <TableHead className="text-right">可用</TableHead>
                    <TableHead className="text-right">补货点</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockItems.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>
                        <div className="font-mono text-xs">{level.variant.sku}</div>
                        <div className="text-xs text-muted-foreground">{level.variant.product.name}</div>
                      </TableCell>
                      <TableCell>{level.warehouse.name}</TableCell>
                      <TableCell className="text-right font-medium text-amber-700">
                        {formatQuantity(level.quantity.minus(level.reservedQuantity))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatQuantity(level.variant.reorderPoint)}</TableCell>
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