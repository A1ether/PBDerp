"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navGroupsFor } from "@/components/layout/nav";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/lib/roles";

export function SidebarNav({
  role,
  onNavigateAction,
}: {
  role: AppRole;
  onNavigateAction?: () => void;
}) {
  const pathname = usePathname();
  const groups = navGroupsFor(role);

  return (
    <nav className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigateAction}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}