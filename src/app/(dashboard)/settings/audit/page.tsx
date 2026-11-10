import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { pageMeta, parsePageParams, type SearchParams } from "@/lib/pagination";
import { requirePermission } from "@/lib/session";
import { listAuditLogs } from "@/modules/settings/queries";

export const metadata = { title: "审计日志" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { organizationId } = await requirePermission("audit.read");
  const rawParams = await searchParams;
  const params = parsePageParams(rawParams);
  const { items, total } = await listAuditLogs(organizationId, params);
  const meta = pageMeta(total, params.page, params.pageSize);

  return (
    <div>
      <PageHeader title="审计日志" description="所有写操作的不可变记录，按时间倒序。" />
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>操作</TableHead>
              <TableHead>对象</TableHead>
              <TableHead>操作人</TableHead>
              <TableHead>对象 ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell className="font-mono text-xs">{log.action}</TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell>{log.actor?.name ?? "系统"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">暂无审计记录。</p> : null}
        <Pagination basePath="/settings/audit" meta={meta} params={rawParams} />
      </div>
    </div>
  );
}