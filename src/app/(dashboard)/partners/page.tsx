import Link from "next/link";
import { ArrowRight, Store, Truck } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { countPartners } from "@/modules/partners/queries";

export const metadata = { title: "客户与供应商" };

export default async function PartnersPage() {
  const { organizationId } = await requirePermission("partners.read");
  const counts = await countPartners(organizationId);

  return (
    <div>
      <PageHeader title="客户与供应商" description="销售订单引用客户，采购订单引用供应商。" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Store className="size-4" /> 客户</CardTitle>
            <CardDescription>{counts.customers} 个客户</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/partners/customers" className={buttonVariants({ variant: "outline" })}>
              管理客户 <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Truck className="size-4" /> 供应商</CardTitle>
            <CardDescription>{counts.suppliers} 个供应商</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/partners/suppliers" className={buttonVariants({ variant: "outline" })}>
              管理供应商 <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}