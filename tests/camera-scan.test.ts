import { describe, expect, it } from "vitest";

import { hasScannablePhotoData } from "../shared/camera-scan";

describe("NIV camera product scan", () => {
  it("only accepts a captured image that contains data", () => {
    expect(hasScannablePhotoData("a".repeat(101))).toBe(true);
    expect(hasScannablePhotoData("short")).toBe(false);
    expect(hasScannablePhotoData(null)).toBe(false);
  });
});
