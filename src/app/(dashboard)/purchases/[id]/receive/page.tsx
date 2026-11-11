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
import { receivePurchaseOrderPartialAction } from "@/modules/purchases/actions";
import { getPurchaseOrder } from "@/modules/purchases/queries";

export const metadata = { title: "采购收货" };

export default async function ReceivePurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("purchase.receive");
  const order = await getPurchaseOrder(organizationId, id);
  if (!order) notFound();

  const receivable = order.lines.filter((line) => line.quantity.minus(line.receivedQuantity).gt(0));
  if (!["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="无法收货" description={`采购单 ${order.orderNo} 当前状态为 ${order.status}。`} />
        <Link href={`/purchases/${order.id}`} className={buttonVariants({ variant: "outline" })}>
          返回采购单
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="采购收货"
        description={`${order.orderNo} · ${order.supplier.name} · 可修改每行收货数量后提交。`}
      />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={receivePurchaseOrderPartialAction}
            submitLabel="确认收货"
            cancel={<Link href={`/purchases/${order.id}`} className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <input type="hidden" name="id" value={order.id} />
            {receivable.length === 0 ? (
              <p className="text-sm text-muted-foreground">该采购单已全部收货。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / 商品</TableHead>
                    <TableHead className="text-right">采购数量</TableHead>
                    <TableHead className="text-right">已收</TableHead>
                    <TableHead className="text-right">剩余</TableHead>
                    <TableHead className="w-36 text-right">本次收货</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivable.map((line) => {
                    const remaining = line.quantity.minus(line.receivedQuantity);
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{line.skuSnapshot}</div>
                          <div className="text-sm">{line.nameSnapshot}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatQuantity(line.quantity)}</TableCell>
                        <TableCell className="text-right">{formatQuantity(line.receivedQuantity)}</TableCell>
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
              数量填 0 的行不会收货；全部收完后采购单状态变为「已收货」，否则为「部分收货」。
            </p>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}