import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SearchParams } from "@/lib/pagination";

export function SearchForm({
  action,
  params,
  placeholder = "搜索...",
}: {
  action: string;
  params: SearchParams;
  placeholder?: string;
}) {
  return (
    <form action={action} method="get" className="flex w-full max-w-sm items-center gap-2">
      {Object.entries(params).map(([key, value]) => {
        if (["q", "page"].includes(key) || value === undefined) return null;
        if (Array.isArray(value)) {
          return value.map((item) => (
            <input key={`${key}-${item}`} type="hidden" name={key} value={item} />
          ));
        }
        return <input key={key} type="hidden" name={key} value={value} />;
      })}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={typeof params.q === "string" ? params.q : ""} placeholder={placeholder} className="pl-8" />
      </div>
      <Button type="submit" variant="outline">
        搜索
      </Button>
    </form>
  );
}