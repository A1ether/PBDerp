import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/shared/action-form";
import { TextAreaField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { SearchParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { importOrdersAction } from "@/modules/channels/actions";
import { getChannel } from "@/modules/channels/queries";

export const metadata = { title: "渠道详情" };

const TYPE_LABELS: Record<string, string> = {
  CUSTOM: "自定义 / CSV",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  TAOBAO: "淘宝",
  JD: "京东",
  DOUYIN: "抖音",
};

const SAMPLE_CSV = `externalOrderNo,customerName,customerPhone,warehouseCode,sku,quantity,unitPrice,taxRate
EXT-1001,张三,13800000001,WH-001,P-1001-BLK-M,2,129,0
EXT-1001,张三,13800000001,WH-001,P-1001-WHT-L,1,129,0
EXT-1002,李四,13800000002,WH-001,P-3001-NAT,3,89,0`;

export default async function ChannelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const rawParams = await searchParams;
  const { organizationId, role } = await requirePermission("channels.read");
  const channel = await getChannel(organizationId, id);
  if (!channel) notFound();

  const canWrite = can(role, "channels.write");
  const imported = typeof rawParams.imported === "string" ? rawParams.imported : "";
  const skipped = typeof rawParams.skipped === "string" ? rawParams.skipped : "";
  const failed = typeof rawParams.failed === "string" ? rawParams.failed : "";
  const showResult = imported !== "" || skipped !== "" || failed !== "";

  return (
    <div>
      <PageHeader
        title={channel.name}
        description={`${TYPE_LABELS[channel.type] ?? channel.type} · ${channel.code} · 最后同步 ${formatDateTime(channel.lastSyncAt)}`}
        actions={<StatusBadge status={channel.status} />}
      />

      {showResult ? (
        <Alert className="mb-4">
          <AlertTitle>导入完成</AlertTitle>
          <AlertDescription>
            成功 {imported || 0} 单，跳过重复 {skipped || 0} 单，失败 {failed || 0} 单。
            失败的订单会保留在下方记录中。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>订单 CSV 导入</CardTitle></CardHeader>
          <CardContent>
            {canWrite ? (
              <ActionForm action={importOrdersAction} submitLabel="导入订单" className="space-y-4">
                <input type="hidden" name="channelId" value={channel.id} />
                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">CSV 列（首行表头，列名不区分大小写）</p>
                  <p className="mt-1">必填：externalOrderNo、customerName、sku、quantity、unitPrice</p>
                  <p>可选：customerCode、customerPhone、warehouseCode、taxRate、orderedAt、note</p>
                  <p className="mt-1">同一 externalOrderNo 的多行会合并为一张销售订单；重复订单号会跳过；单价填 0 时使用 SKU 销售价。</p>
                </div>
                <TextAreaField
                  label="CSV 内容"
                  name="csv"
                  required
                  rows={10}
                  placeholder={SAMPLE_CSV}
                  defaultValue=""
                />
              </ActionForm>
            ) : (
              <p className="text-sm text-muted-foreground">当前角色无渠道写权限。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>渠道信息</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="类型" value={TYPE_LABELS[channel.type] ?? channel.type} />
            <Info label="编码" value={channel.code} />
            <Info label="状态" value={<StatusBadge status={channel.status} />} />
            <Info label="导入订单" value={String(channel._count.orders)} />
            <Info label="最后同步" value={formatDateTime(channel.lastSyncAt)} />
            <Info label="创建时间" value={formatDateTime(channel.createdAt)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>最近导入记录</CardTitle></CardHeader>
        <CardContent>
          {channel.orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">还没有导入记录。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>外部订单号</TableHead>
                  <TableHead>销售订单</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>导入时间</TableHead>
                  <TableHead>错误</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channel.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.externalOrderNo}</TableCell>
                    <TableCell>
                      {order.salesOrder ? (
                        <Link href={`/sales/${order.salesOrderId}`} className="font-mono text-xs text-primary hover:underline">
                          {order.salesOrder.orderNo}
                        </Link>
                      ) : "-"}
                    </TableCell>
                    <TableCell><StatusBadge status={order.status} label={order.status === "IMPORTED" ? "已导入" : "失败"} /></TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(order.importedAt ?? order.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-rose-600">{order.errorMessage ?? "-"}</TableCell>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>;
}