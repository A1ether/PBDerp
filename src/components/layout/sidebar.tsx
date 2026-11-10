import Link from "next/link";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { AppRole } from "@/lib/roles";

export function Sidebar({ role }: { role: AppRole }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            PB
          </span>
          <span>
            <span className="block text-sm font-semibold leading-none">PBDerp</span>
            <span className="mt-1 block text-xs text-muted-foreground">电商 ERP</span>
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <SidebarNav role={role} />
      </div>
      <div className="border-t p-4 text-xs text-muted-foreground">
        库存台账 · 订单履约 · 轻财务
      </div>
    </aside>
  );
}