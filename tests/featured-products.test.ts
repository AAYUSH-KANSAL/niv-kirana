import { describe, expect, it } from "vitest";

import { featuredProductIds, selectFeaturedProducts, toggleFeaturedProductId } from "../shared/featured-products";

describe("owner-picked showcase", () => {
  const products = [
    { id: "rice", featured: true },
    { id: "diwali", featured: false },
    { id: "tea", featured: true },
  ];

  it("uses the owner's selected IDs and preserves their order", () => {
    expect(selectFeaturedProducts(products, ["diwali", "rice"])).toEqual([products[1], products[0]]);
  });

  it("falls back to catalog featured flags and ignores deleted IDs", () => {
    expect(featuredProductIds(products, ["missing", "tea"])).toEqual(["tea"]);
    expect(featuredProductIds(products)).toEqual(["rice", "tea"]);
  });

  it("toggles a product without changing the rest of the owner's order", () => {
    expect(toggleFeaturedProductId(["rice", "tea"], "diwali")).toEqual(["rice", "tea", "diwali"]);
    expect(toggleFeaturedProductId(["rice", "tea"], "rice")).toEqual(["tea"]);
  });
});
