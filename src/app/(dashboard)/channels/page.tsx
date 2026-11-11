import Link from "next/link";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/lib/button-variants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { listChannels } from "@/modules/channels/queries";

export const metadata = { title: "渠道" };

const TYPE_LABELS: Record<string, string> = {
  CUSTOM: "自定义 / CSV",
  SHOPIFY: "Shopify",
  TIKTOK_SHOP: "TikTok Shop",
  TAOBAO: "淘宝",
  JD: "京东",
  DOUYIN: "抖音",
};

export default async function ChannelsPage() {
  const { organizationId, role } = await requirePermission("channels.read");
  const channels = await listChannels(organizationId);
  const canWrite = can(role, "channels.write");

  return (
    <div>
      <PageHeader
        title="渠道"
        description="渠道订单接入与同步记录。当前提供 CSV 导入；平台 API 适配器按同一契约扩展。"
        actions={canWrite ? <Link href="/channels/new" className={buttonVariants()}><Plus className="size-4" />新建渠道</Link> : null}
      />

      {channels.length === 0 ? (
        <EmptyState
          title="还没有渠道"
          description="创建渠道后即可通过 CSV 导入外部订单。"
          action={canWrite ? <Link href="/channels/new" className={buttonVariants({ size: "sm" })}>新建渠道</Link> : null}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>渠道</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>编码</TableHead>
                <TableHead className="text-right">导入订单</TableHead>
                <TableHead>最后同步</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell><Link href={`/channels/${channel.id}`} className="font-medium hover:underline">{channel.name}</Link></TableCell>
                  <TableCell>{TYPE_LABELS[channel.type] ?? channel.type}</TableCell>
                  <TableCell className="font-mono text-xs">{channel.code}</TableCell>
                  <TableCell className="text-right">{channel._count.orders}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(channel.lastSyncAt)}</TableCell>
                  <TableCell><StatusBadge status={channel.status} /></TableCell>
                  <TableCell className="text-right"><Link href={`/channels/${channel.id}`} className="text-sm text-primary hover:underline">打开</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}