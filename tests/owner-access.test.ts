import { describe, expect, it } from "vitest";

import { isDemoOwnerAccessCode, OWNER_DEMO_PIN } from "../shared/owner-access";

describe("NIV Owner demo access", () => {
  it("accepts the configured four-digit demo PIN", () => {
    expect(isDemoOwnerAccessCode(OWNER_DEMO_PIN)).toBe(true);
    expect(isDemoOwnerAccessCode("12 34")).toBe(true);
  });

  it("rejects incorrect owner PINs", () => {
    expect(isDemoOwnerAccessCode("0000")).toBe(false);
    expect(isDemoOwnerAccessCode("12345")).toBe(false);
  });
});
