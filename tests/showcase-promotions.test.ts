import { describe, expect, it } from "vitest";

import { catalogShowcaseSections, discountedShowcasePrice, nextShowcaseSlideIndex, productDiscount, randomizeShowcaseProducts, sanitizeDiscount, shouldRenderShowcaseForSection, showcaseTagline } from "../shared/showcase-promotions";

describe("showcase promotions", () => {
  it("clamps owner discount values and calculates the customer offer price", () => {
    expect(sanitizeDiscount(120)).toBe(99);
    expect(productDiscount({ milk: 20 }, "milk")).toBe(20);
    expect(discountedShowcasePrice(100, 20)).toBe(80);
    expect(discountedShowcasePrice(285, 10)).toBe(257);
  });

  it("inserts catalog sections after each group of nine products", () => {
    const products = Array.from({ length: 19 }, (_, index) => ({ id: `item-${index + 1}` }));
    expect(catalogShowcaseSections(products).map((section) => section.length)).toEqual([9, 9, 1]);
    expect(catalogShowcaseSections(products.slice(0, 9), 3).map((section) => section.length)).toEqual([3, 3, 3]);
    expect(shouldRenderShowcaseForSection(0, 9, 5)).toBe(true);
    expect(shouldRenderShowcaseForSection(1, 9, 5)).toBe(true);
    expect(shouldRenderShowcaseForSection(2, 9, 5)).toBe(false);
  });

  it("keeps every owner-selected item in a stable randomized showcase order", () => {
    const products = [{ id: "rice" }, { id: "milk" }, { id: "tea" }, { id: "dal" }];
    expect(randomizeShowcaseProducts(products, 1).map((product) => product.id).sort()).toEqual(["dal", "milk", "rice", "tea"]);
    expect(randomizeShowcaseProducts(products, 2)).toEqual(randomizeShowcaseProducts(products, 2));
    expect(showcaseTagline(1).title).not.toBe(showcaseTagline(2).title);
  });

  it("moves one showcase card at a time and loops after the last card", () => {
    expect(nextShowcaseSlideIndex(0, 4)).toBe(1);
    expect(nextShowcaseSlideIndex(3, 4)).toBe(0);
    expect(nextShowcaseSlideIndex(0, 1)).toBe(0);
  });
});
