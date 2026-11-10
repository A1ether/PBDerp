import { describe, expect, it } from "vitest";

import { can, PERMISSIONS } from "@/lib/permissions";

describe("role permissions", () => {
  it("gives ADMIN every permission", () => {
    for (const permission of PERMISSIONS) {
      expect(can("ADMIN", permission)).toBe(true);
    }
  });

  it("keeps VIEWER read-only", () => {
    expect(can("VIEWER", "products.read")).toBe(true);
    expect(can("VIEWER", "products.write")).toBe(false);
    expect(can("VIEWER", "inventory.write")).toBe(false);
    expect(can("VIEWER", "settings.write")).toBe(false);
  });

  it("lets sales write orders but not inventory", () => {
    expect(can("SALES", "sales.write")).toBe(true);
    expect(can("SALES", "inventory.write")).toBe(false);
    expect(can("SALES", "purchase.write")).toBe(false);
  });

  it("lets warehouse receive and ship but not price orders", () => {
    expect(can("WAREHOUSE", "purchase.receive")).toBe(true);
    expect(can("WAREHOUSE", "sales.ship")).toBe(true);
    expect(can("WAREHOUSE", "finance.write")).toBe(false);
  });

  it("does not let managers manage users", () => {
    expect(can("MANAGER", "settings.read")).toBe(true);
    expect(can("MANAGER", "settings.write")).toBe(false);
  });
});