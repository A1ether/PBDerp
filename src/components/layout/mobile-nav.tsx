"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { AppRole } from "@/lib/roles";

export function MobileNav({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开菜单" />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-left">PBDerp · 电商 ERP</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <SidebarNav role={role} onNavigateAction={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}