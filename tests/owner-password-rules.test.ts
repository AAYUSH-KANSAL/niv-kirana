import { describe, expect, it } from "vitest";

import { INITIAL_OWNER_PASSWORD, isOwnerLoginId } from "../shared/owner-login";
import { validateOwnerPasswordChange } from "../shared/owner-password-rules";

describe("owner credentials", () => {
  it("accepts the fixed owner ID regardless of case", () => {
    expect(isOwnerLoginId("niv027")).toBe(true);
    expect(isOwnerLoginId("customer")).toBe(false);
  });

  it("requires a verified, matching, new password", () => {
    expect(validateOwnerPasswordChange(INITIAL_OWNER_PASSWORD, "NewPass@@55", "NewPass@@55").valid).toBe(true);
    expect(validateOwnerPasswordChange(INITIAL_OWNER_PASSWORD, "short", "short").valid).toBe(false);
  });
});
