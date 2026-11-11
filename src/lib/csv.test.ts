import { describe, expect, it } from "vitest";

import { parseCsv, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("parses quoted fields, commas and escaped quotes", () => {
    const rows = parseCsv('a,b,c\r\n1,"x,y","he said ""hi"""\r\n');
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "x,y", 'he said "hi"'],
    ]);
  });

  it("serializes and round-trips values", () => {
    const text = toCsv([
      ["sku", "name"],
      ["A-1", 'Widget, "large"'],
    ]);
    expect(text).toBe('sku,name\r\nA-1,"Widget, ""large"""');
    expect(parseCsv(text)).toEqual([
      ["sku", "name"],
      ["A-1", 'Widget, "large"'],
    ]);
  });

  it("skips blank rows", () => {
    expect(parseCsv("\r\n\r\na,b\r\n")).toEqual([["a", "b"]]);
  });
});