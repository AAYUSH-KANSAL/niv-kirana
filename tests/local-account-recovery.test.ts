import { describe, expect, it } from "vitest";

import { shouldRecoverLegacyLocalAccount } from "../shared/local-account-recovery";

describe("legacy local account recovery", () => {
  it("recovers a pre-account-list customer record so its registered number can log in", () => {
    expect(shouldRecoverLegacyLocalAccount([], "+91 70609 02859")).toBe(true);
  });

  it("does not duplicate an account that already exists in the current account list", () => {
    expect(shouldRecoverLegacyLocalAccount(["7060902859"], "91 70609 02859")).toBe(false);
  });
});
