import { describe, expect, it } from "vitest";

import { normalizeProductImageUrls, primaryProductImageUrl } from "../shared/product-images";

describe("product image helpers", () => {
  it("preserves imageUrls order and falls back to the legacy imageUrl", () => {
    expect(normalizeProductImageUrls([" first ", "second"], "legacy")).toEqual(["first", "second", "legacy"]);
    expect(normalizeProductImageUrls(undefined, "legacy")).toEqual(["legacy"]);
  });

  it("removes empty and duplicate image URLs", () => {
    expect(normalizeProductImageUrls(["one", "", "one", "two"], "two")).toEqual(["one", "two"]);
  });

  it("uses the first saved image as the product primary image", () => {
    expect(primaryProductImageUrl(["first", "second"], "legacy")).toBe("first");
    expect(primaryProductImageUrl(undefined, "legacy")).toBe("legacy");
    expect(primaryProductImageUrl()).toBeUndefined();
  });
});
