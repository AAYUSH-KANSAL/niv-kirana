import { describe, expect, it } from "vitest";

import { galleryIndexFor } from "../shared/product-gallery";

describe("product gallery navigation", () => {
  it("moves one photo at a time without exceeding the gallery bounds", () => {
    expect(galleryIndexFor(0, 3, 1)).toBe(1);
    expect(galleryIndexFor(1, 3, 1)).toBe(2);
    expect(galleryIndexFor(2, 3, 1)).toBe(2);
    expect(galleryIndexFor(0, 3, -1)).toBe(0);
    expect(galleryIndexFor(1, 3, -1)).toBe(0);
  });

  it("stays at zero when there are no photos", () => {
    expect(galleryIndexFor(0, 0, 1)).toBe(0);
    expect(galleryIndexFor(2, 0, -1)).toBe(0);
  });
});
