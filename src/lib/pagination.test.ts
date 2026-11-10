import { describe, expect, it } from "vitest";

import { pageMeta, parsePageParams } from "@/lib/pagination";

describe("pagination", () => {
  it("parses defaults and clamps page size", () => {
    expect(parsePageParams({})).toEqual({
      page: 1,
      pageSize: 20,
      q: "",
      sort: "createdAt",
      dir: "desc",
    });
    expect(parsePageParams({ page: "2", pageSize: "999" }).pageSize).toBe(100);
  });

  it("computes page metadata", () => {
    expect(pageMeta(0, 1, 20)).toMatchObject({ pageCount: 1, hasPrev: false, hasNext: false });
    expect(pageMeta(45, 3, 20)).toMatchObject({ page: 3, pageCount: 3, hasPrev: true, hasNext: false });
  });

  it("clamps an out-of-range page", () => {
    expect(pageMeta(10, 99, 20).page).toBe(1);
  });
});