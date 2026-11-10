import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/roles";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { getOrganization } from "@/modules/settings/queries";

export const metadata = { title: "设置" };

export default async function SettingsPage() {
  const { organizationId, role, user } = await requirePermission("settings.read");
  const organization = await getOrganization(organizationId);

  return (
    <div>
      <PageHeader title="设置" description="组织、用户与审计。" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>组织信息</CardTitle>
            <CardDescription>当前部署只有一个组织；数据模型已预留多租户字段。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="组织名称" value={organization?.name ?? "-"} />
            <Info label="标识" value={organization?.slug ?? "-"} />
            <Info label="本位币" value={organization?.currency ?? "CNY"} />
            <Info label="时区" value={organization?.timezone ?? "Asia/Shanghai"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>当前账号</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="姓名" value={user.name} />
            <Info label="角色" value={ROLE_LABELS[role]} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="size-4" /> 用户管理</CardTitle>
            <CardDescription>创建账号、分配角色。</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/users" className={buttonVariants({ variant: "outline" })}>
              打开用户管理 <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4" /> 审计日志</CardTitle>
            <CardDescription>所有写操作的不可变记录。</CardDescription>
          </CardHeader>
          <CardContent>
            {can(role, "audit.read") ? (
              <Link href="/settings/audit" className={buttonVariants({ variant: "outline" })}>
                查看审计日志 <ArrowRight className="size-4" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">当前角色无审计日志权限。</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}