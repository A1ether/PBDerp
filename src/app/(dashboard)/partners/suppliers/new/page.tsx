import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { SupplierForm } from "../../supplier-form";

export const metadata = { title: "新建供应商" };

export default async function NewSupplierPage() {
  await requirePermission("partners.write");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="新建供应商" />
      <Card><CardContent className="pt-6"><SupplierForm /></CardContent></Card>
    </div>
  );
}