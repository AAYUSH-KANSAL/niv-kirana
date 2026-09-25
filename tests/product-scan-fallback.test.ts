import { describe, expect, it } from "vitest";

import { createProductScanFallback } from "../shared/product-scan-fallback";

describe("NIV product scan review fallback", () => {
  it("creates an editable review draft even before AI extraction finishes", () => {
    const draft = createProductScanFallback("file://packet.jpg");
    expect(draft.name).toBe("");
    expect(draft.mrp).toBeNull();
    expect(draft.imageUrl).toBe("file://packet.jpg");
  });
});
