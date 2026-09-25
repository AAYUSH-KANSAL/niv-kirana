import { describe, expect, it } from "vitest";

import { accountNotFoundFeedback } from "../shared/login-feedback";

describe("login feedback", () => {
  it("tells an unregistered customer to create an account", () => {
    expect(accountNotFoundFeedback("9876543210")).toContain("Create account");
  });
});
