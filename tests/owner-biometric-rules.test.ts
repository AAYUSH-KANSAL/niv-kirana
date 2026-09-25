import { describe, expect, it } from "vitest";

import { biometricMessage, shouldRequestOwnerBiometric } from "../shared/owner-biometric-rules";

describe("owner biometric policy", () => {
  it("requests biometric only when owner has enabled it", () => {
    expect(shouldRequestOwnerBiometric(true)).toBe(true);
    expect(shouldRequestOwnerBiometric(false)).toBe(false);
  });

  it("gives a clear no-hardware fallback message", () => {
    expect(biometricMessage("unavailable")).toContain("Owner password");
  });
});
