import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { getCustomer } from "@/modules/partners/queries";
import { CustomerForm } from "../../../customer-form";

export const metadata = { title: "编辑客户" };

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("partners.write");
  const customer = await getCustomer(organizationId, id);
  if (!customer) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="编辑客户" description={customer.name} />
      <Card><CardContent className="pt-6"><CustomerForm customer={customer} /></CardContent></Card>
    </div>
  );
}