export type SearchParams = Record<string, string | string[] | undefined>;

export type PageParams = {
  page: number;
  pageSize: number;
  q: string;
  sort: string;
  dir: "asc" | "desc";
};

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function parsePageParams(params: SearchParams, defaults?: Partial<PageParams>): PageParams {
  const page = toPositiveInt(first(params.page), 1);
  const pageSize = Math.min(toPositiveInt(first(params.pageSize), defaults?.pageSize ?? DEFAULT_PAGE_SIZE), 100);
  const sort = first(params.sort) || defaults?.sort || "createdAt";
  const dir = first(params.dir) === "asc" ? "asc" : "desc";

  return {
    page,
    pageSize,
    q: (first(params.q) || "").trim(),
    sort,
    dir,
  };
}

export function pageMeta(total: number, page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    total,
    page: current,
    pageSize,
    pageCount,
    hasPrev: current > 1,
    hasNext: current < pageCount,
    from: total === 0 ? 0 : (current - 1) * pageSize + 1,
    to: Math.min(current * pageSize, total),
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}