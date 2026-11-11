import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  ClipboardCheck,
  Boxes,
  LayoutDashboard,
  Package,
  Plug,
  RotateCcw,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { can, type Permission } from "@/lib/permissions";
import type { AppRole } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "概览",
    items: [
      { href: "/", label: "仪表盘", icon: LayoutDashboard, permission: "dashboard.read" },
      { href: "/reports", label: "报表", icon: BarChart3, permission: "dashboard.read" },
    ],
  },
  {
    label: "商品与库存",
    items: [
      { href: "/products", label: "商品", icon: Package, permission: "products.read" },
      { href: "/inventory", label: "库存", icon: Boxes, permission: "inventory.read" },
      { href: "/inventory/stocktake", label: "盘点", icon: ClipboardCheck, permission: "inventory.read" },
      { href: "/warehouses", label: "仓库", icon: Truck, permission: "warehouse.read" },
    ],
  },
  {
    label: "交易",
    items: [
      { href: "/sales", label: "销售订单", icon: ShoppingCart, permission: "sales.read" },
      { href: "/returns", label: "退货", icon: RotateCcw, permission: "sales.read" },
      { href: "/purchases", label: "采购订单", icon: Truck, permission: "purchase.read" },
      { href: "/partners", label: "客户与供应商", icon: Users, permission: "partners.read" },
      { href: "/finance", label: "收付款", icon: Wallet, permission: "finance.read" },
      { href: "/channels", label: "渠道", icon: Plug, permission: "channels.read" },
    ],
  },
  {
    label: "系统",
    items: [{ href: "/settings", label: "设置", icon: Settings, permission: "settings.read" }],
  },
];

export function navGroupsFor(role: AppRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}

export const PAGE_LABELS: Record<string, string> = {
  "/": "仪表盘",
  "/reports": "报表",
  "/products": "商品",
  "/products/new": "新建商品",
  "/inventory": "库存",
  "/inventory/stocktake": "盘点",
  "/warehouses": "仓库",
  "/sales": "销售订单",
  "/sales/new": "新建销售订单",
  "/returns": "退货",
  "/purchases": "采购订单",
  "/purchases/new": "新建采购订单",
  "/partners": "客户与供应商",
  "/finance": "收付款",
  "/channels": "渠道",
  "/settings": "设置",
  "/settings/users": "用户",
  "/settings/audit": "审计日志",
};