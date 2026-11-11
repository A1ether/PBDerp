import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CONFIRMED: "border-blue-200 bg-blue-50 text-blue-700",
  PARTIALLY_SHIPPED: "border-amber-200 bg-amber-50 text-amber-700",
  SHIPPED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
  ORDERED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  PARTIALLY_RECEIVED: "border-amber-200 bg-amber-50 text-amber-700",
  RECEIVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-600",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-amber-200 bg-amber-50 text-amber-700",
  UNPAID: "border-slate-200 bg-slate-50 text-slate-600",
  DRAFT: "border-slate-200 bg-slate-50 text-slate-600",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  INACTIVE: "border-slate-200 bg-slate-50 text-slate-500",
  ARCHIVED: "border-slate-200 bg-slate-50 text-slate-500",
  REFUNDED: "border-rose-200 bg-rose-50 text-rose-700",
  ACTIVE_RESERVATION: "border-blue-200 bg-blue-50 text-blue-700",
};

const LABELS: Record<string, string> = {
  ACTIVE: "启用",
  INACTIVE: "停用",
  ARCHIVED: "已归档",
  DRAFT: "草稿",
  CONFIRMED: "已确认",
  PARTIALLY_SHIPPED: "部分出库",
  SHIPPED: "已出库",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
  APPROVED: "已审批",
  ORDERED: "已下单",
  PARTIALLY_RECEIVED: "部分收货",
  RECEIVED: "已收货",
  CLOSED: "已关闭",
  UNPAID: "未付款",
  PARTIAL: "部分付款",
  PAID: "已付款",
  REFUNDED: "已退款",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <Badge variant="outline" className={cn("font-normal", TONES[status] ?? "")}>
      {label ?? LABELS[status] ?? status}
    </Badge>
  );
}