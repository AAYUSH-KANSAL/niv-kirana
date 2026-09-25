import { describe, expect, it } from "vitest";

import { shouldShowOwnerTab } from "../shared/owner-navigation";

describe("owner navigation", () => {
  it("keeps the owner tab hidden for customer sessions", () => {
    expect(shouldShowOwnerTab(false)).toBe(false);
    expect(shouldShowOwnerTab(true)).toBe(true);
  });
});
