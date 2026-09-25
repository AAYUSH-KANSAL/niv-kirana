import { describe, expect, it } from "vitest";

import { canManageCatalog } from "../shared/catalog-access";

describe("catalog access", () => {
  it("allows product changes only in Owner mode", () => {
    expect(canManageCatalog(true)).toBe(true);
    expect(canManageCatalog(false)).toBe(false);
  });
});
