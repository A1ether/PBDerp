import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/session";
import { CustomerForm } from "../../customer-form";

export const metadata = { title: "新建客户" };

export default async function NewCustomerPage() {
  await requirePermission("partners.write");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="新建客户" />
      <Card><CardContent className="pt-6"><CustomerForm /></CardContent></Card>
    </div>
  );
}