import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatQuantity } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { shipSalesOrderPartialAction } from "@/modules/sales/actions";
import { getSalesOrder } from "@/modules/sales/queries";

export const metadata = { title: "销售出库" };

export default async function ShipSalesOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("sales.ship");
  const order = await getSalesOrder(organizationId, id);
  if (!order) notFound();

  const shippable = order.lines.filter((line) => line.quantity.minus(line.shippedQuantity).gt(0));
  if (order.status !== "CONFIRMED" && order.status !== "PARTIALLY_SHIPPED") {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="无法出库" description={`订单 ${order.orderNo} 当前状态为 ${order.status}。`} />
        <Link href={`/sales/${order.id}`} className={buttonVariants({ variant: "outline" })}>
          返回订单
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="销售出库"
        description={`${order.orderNo} · ${order.customer.name} · 可修改每行出库数量后提交。`}
      />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={shipSalesOrderPartialAction}
            submitLabel="确认出库"
            cancel={<Link href={`/sales/${order.id}`} className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <input type="hidden" name="id" value={order.id} />
            {shippable.length === 0 ? (
              <p className="text-sm text-muted-foreground">该订单已全部出库。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / 商品</TableHead>
                    <TableHead className="text-right">订单数量</TableHead>
                    <TableHead className="text-right">已出库</TableHead>
                    <TableHead className="text-right">剩余</TableHead>
                    <TableHead className="w-36 text-right">本次出库</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippable.map((line) => {
                    const remaining = line.quantity.minus(line.shippedQuantity);
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{line.skuSnapshot}</div>
                          <div className="text-sm">{line.nameSnapshot}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                        <TableCell className="text-right">{formatQuantity(line.shippedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatQuantity(remaining)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            name={`qty_${line.id}`}
                            type="number"
                            min="0"
                            max={remaining.toString()}
                            step="0.0001"
                            defaultValue={remaining.toString()}
                            className="h-8 w-28 text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground">
              数量填 0 的行不会出库；全部出完后订单状态变为「已出库」，否则为「部分出库」。
            </p>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}