"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { PAGE_LABELS } from "@/components/layout/nav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

type TopbarProps = {
  name: string;
  email: string;
  role: AppRole;
  organizationName: string;
};

export function Topbar({ name, email, role, organizationName }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [
    { href: "/", label: "首页" },
    ...segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      return {
        href,
        label: PAGE_LABELS[href] ?? decodeURIComponent(segment),
      };
    }),
  ];

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <MobileNav role={role} />
      <div className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <span key={crumb.href} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3.5 shrink-0" /> : null}
            {index === crumbs.length - 1 ? (
              <span className="truncate font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="truncate hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-xs text-muted-foreground">{organizationName}</p>
        <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="gap-2 px-2" />}
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {name.slice(0, 2).toUpperCase()}
          </span>
          <span className="hidden text-sm font-medium md:inline">{name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <span className="block text-sm">{name}</span>
            <span className="block text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>账号与设置</DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}