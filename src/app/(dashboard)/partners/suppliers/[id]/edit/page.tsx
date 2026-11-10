import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { getSupplier } from "@/modules/partners/queries";
import { SupplierForm } from "../../../supplier-form";

export const metadata = { title: "编辑供应商" };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requirePermission("partners.write");
  const supplier = await getSupplier(organizationId, id);
  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="编辑供应商" description={supplier.name} />
      <Card><CardContent className="pt-6"><SupplierForm supplier={supplier} /></CardContent></Card>
    </div>
  );
}