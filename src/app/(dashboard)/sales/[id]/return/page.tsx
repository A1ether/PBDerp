import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { TextAreaField } from "@/components/shared/form-field";
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
import { formatMoney, formatQuantity } from "@/lib/format";
import { requirePermission } from "@/lib/session";
import { createSalesReturnAction } from "@/modules/returns/actions";
import { getSalesOrder } from "@/modules/sales/queries";

export const metadata = { title: "创建退货" };

export default async function CreateSalesReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("sales.write");
  const order = await getSalesOrder(organizationId, id);
  if (!order) notFound();

  const returnable = order.lines.filter((line) => line.shippedQuantity.minus(line.returnedQuantity).gt(0));
  const canReturn = ["SHIPPED", "COMPLETED", "PARTIALLY_SHIPPED"].includes(order.status) && returnable.length > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="创建销售退货"
        description={`${order.orderNo} · ${order.customer.name} · 可退数量按已出库 - 已退货计算。`}
      />
      <Card>
        <CardContent className="pt-6">
          {!canReturn ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">该订单当前没有可退货的商品行。</p>
              <Link href={`/sales/${order.id}`} className={buttonVariants({ variant: "outline" })}>返回订单</Link>
            </div>
          ) : (
            <ActionForm
              action={createSalesReturnAction}
              submitLabel="创建退货单"
              cancel={<Link href={`/sales/${order.id}`} className={buttonVariants({ variant: "outline" })}>取消</Link>}
            >
              <input type="hidden" name="orderId" value={order.id} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU / 商品</TableHead>
                    <TableHead className="text-right">已出库</TableHead>
                    <TableHead className="text-right">已退货</TableHead>
                    <TableHead className="text-right">可退</TableHead>
                    <TableHead className="w-36 text-right">本次退货</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnable.map((line) => {
                    const max = line.shippedQuantity.minus(line.returnedQuantity);
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-mono text-xs">{line.skuSnapshot}</div>
                          <div className="text-sm">{line.nameSnapshot}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatQuantity(line.shippedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatQuantity(line.returnedQuantity)}</TableCell>
                        <TableCell className="text-right">{formatQuantity(max)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            name={`qty_${line.id}`}
                            type="number"
                            min="0"
                            max={max.toString()}
                            step="0.0001"
                            defaultValue="0"
                            className="h-8 w-28 text-right"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                默认按 0 处理；退款金额由服务端按「退货数量 × 原单价」计算，确认入库时生成退款流水。
              </p>
              <TextAreaField label="退货原因" name="reason" placeholder="例如：尺码不合适、质量问题" rows={3} />
            </ActionForm>
          )}
        </CardContent>
      </Card>
      {canReturn ? (
        <p className="mt-2 text-xs text-muted-foreground">
          当前订单金额：{formatMoney(order.grandTotal)}；退货入库后库存会增加。
        </p>
      ) : null}
    </div>
  );
}