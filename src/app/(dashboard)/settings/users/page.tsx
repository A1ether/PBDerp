import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { ROLE_LABELS, USER_ROLES } from "@/lib/roles";
import { requirePermission } from "@/lib/session";
import { createUserAction } from "@/modules/settings/actions";
import { listUsers } from "@/modules/settings/queries";
import { UserRoleForm } from "./role-form";

export const metadata = { title: "用户管理" };

export default async function UsersPage() {
  const { organizationId, role } = await requirePermission("settings.read");
  const users = await listUsers(organizationId);
  const canWrite = can(role, "settings.write");

  return (
    <div>
      <PageHeader title="用户管理" description="每个账号绑定一个角色；角色决定模块读写权限。" />

      <Card>
        <CardHeader><CardTitle>用户列表</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>创建时间</TableHead>
                {canWrite ? <TableHead className="text-right">调整角色</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{ROLE_LABELS[user.role]}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  {canWrite ? <TableCell className="text-right"><UserRoleForm userId={user.id} role={user.role} /></TableCell> : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canWrite ? (
        <Card className="mt-4">
          <CardHeader><CardTitle>新建用户</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createUserAction} submitLabel="创建账号" className="max-w-2xl">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="姓名" name="name" required />
                <TextField label="邮箱" name="email" type="email" required />
                <TextField label="初始密码" name="password" type="text" required hint="至少 8 位；创建后请让用户尽快修改。" />
                <NativeSelect
                  label="角色"
                  name="role"
                  required
                  defaultValue="VIEWER"
                  options={USER_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
                />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}