import { describe, expect, it } from "vitest";

import { dec, lineAmount, money, quantity, sum, taxAmount } from "@/lib/money";

describe("money helpers", () => {
  it("adds decimal values without floating point drift", () => {
    expect(sum(["0.1", "0.2"]).toFixed(2)).toBe("0.30");
  });

  it("computes a line amount with discount", () => {
    expect(lineAmount("3", "19.99", "5").toFixed(2)).toBe("54.97");
  });

  it("computes tax on a line", () => {
    expect(taxAmount("100", "0.13").toFixed(2)).toBe("13.00");
  });

  it("formats money and quantity", () => {
    expect(money("12.5")).toBe("12.50");
    expect(quantity("12.5000")).toBe("12.5");
    expect(quantity("0.0000")).toBe("0");
  });

  it("treats empty values as zero", () => {
    expect(dec("").isZero()).toBe(true);
    expect(dec(null).isZero()).toBe(true);
  });
});