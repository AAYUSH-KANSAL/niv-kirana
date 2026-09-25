import { describe, expect, it } from "vitest";

import { isOwnerLoginId } from "../shared/owner-login";

describe("owner login", () => {
  it("accepts only the fixed owner ID", () => {
    expect(isOwnerLoginId("Niv027")).toBe(true);
    expect(isOwnerLoginId("customer")).toBe(false);
  });
});
