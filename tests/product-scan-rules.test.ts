import { describe, expect, it } from "vitest";

import { normalizeDetectedMrp, sanitizeDetectedProductName } from "../shared/product-scan-rules";

describe("NIV AI product scanner rules", () => {
  it("normalizes a printed MRP while rejecting invalid values", () => {
    expect(normalizeDetectedMrp("MRP ₹ 74.50")).toBe(74.5);
    expect(normalizeDetectedMrp(120)).toBe(120);
    expect(normalizeDetectedMrp("not visible")).toBeNull();
  });

  it("keeps detected product names readable for owner review", () => {
    expect(sanitizeDetectedProductName("  Rajdhani   Besan  ")).toBe("Rajdhani Besan");
    expect(sanitizeDetectedProductName(123)).toBe("Product name needs review");
  });
});
