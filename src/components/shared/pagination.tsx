import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/lib/button-variants";
import type { pageMeta, SearchParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type Meta = ReturnType<typeof pageMeta>;

export function Pagination({
  basePath,
  meta,
  params,
}: {
  basePath: string;
  meta: Meta;
  params: SearchParams;
}) {
  function hrefFor(page: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") continue;
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
      } else {
        query.set(key, value);
      }
    }
    query.set("page", String(page));
    return `${basePath}?${query.toString()}`;
  }

  const linkClass = buttonVariants({ variant: "outline", size: "sm" });
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");

  return (
    <div className="flex flex-col gap-2 border-t px-2 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        共 {meta.total} 条 · 第 {meta.page} / {meta.pageCount} 页
      </span>
      <div className="flex items-center gap-2">
        {meta.hasPrev ? (
          <Link href={hrefFor(meta.page - 1)} className={linkClass}>
            <ChevronLeft className="size-4" />
            上一页
          </Link>
        ) : (
          <span className={disabledClass}>
            <ChevronLeft className="size-4" />
            上一页
          </span>
        )}
        {meta.hasNext ? (
          <Link href={hrefFor(meta.page + 1)} className={linkClass}>
            下一页
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={disabledClass}>
            下一页
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}