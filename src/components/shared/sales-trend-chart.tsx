"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/format";

export function SalesTrendChart({ data }: { data: Array<{ day: string; total: number; orders: number }> }) {
  const hasData = data.some((item) => item.total > 0);

  if (!hasData) {
    return <p className="grid h-64 place-items-center text-sm text-muted-foreground">最近 7 天暂无销售数据。</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="currentColor" stopOpacity={0.22} />
              <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value: string) => value.slice(5)} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={64} tickFormatter={(value: number) => `¥${Math.round(value / 1000)}k`} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Area type="monotone" dataKey="total" stroke="currentColor" strokeWidth={2} fill="url(#sales-fill)" className="text-primary" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}