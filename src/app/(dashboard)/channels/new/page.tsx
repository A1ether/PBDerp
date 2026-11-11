import Link from "next/link";

import { ActionForm } from "@/components/shared/action-form";
import { NativeSelect, TextField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { createChannelAction } from "@/modules/channels/actions";

export const metadata = { title: "新建渠道" };

const TYPES = [
  { value: "CUSTOM", label: "自定义 / CSV" },
  { value: "SHOPIFY", label: "Shopify" },
  { value: "TIKTOK_SHOP", label: "TikTok Shop" },
  { value: "TAOBAO", label: "淘宝" },
  { value: "JD", label: "京东" },
  { value: "DOUYIN", label: "抖音" },
];

export default async function NewChannelPage() {
  await requirePermission("channels.write");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="新建渠道" description="编码用于订单去重与后续映射，创建后不建议修改。" />
      <Card>
        <CardContent className="pt-6">
          <ActionForm
            action={createChannelAction}
            submitLabel="创建渠道"
            cancel={<Link href="/channels" className={buttonVariants({ variant: "outline" })}>取消</Link>}
          >
            <TextField label="渠道名称" name="name" required placeholder="例如 抖音小店" />
            <TextField label="渠道编码" name="code" required placeholder="例如 CH-DOUYIN-01" />
            <NativeSelect label="渠道类型" name="type" required defaultValue="CUSTOM" options={TYPES} />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}