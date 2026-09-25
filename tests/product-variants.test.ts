import { describe, expect, it } from "vitest";

import {
  normalizeProductVariants,
  selectedProductVariant,
  validProductVariantDrafts,
  variantLineKey,
  variantTotal,
} from "../shared/product-variants";

describe("product pack-size variants", () => {
  it("keeps owner-entered prices independent and removes invalid rows", () => {
    expect(validProductVariantDrafts([
      { id: "small", label: " 250 g ", price: 35 },
      { id: "large", label: "1 kg", price: 120 },
      { id: "empty", label: " ", price: 40 },
      { id: "invalid", label: "2 kg", price: -1 },
    ])).toEqual([
      { id: "small", label: "250 g", price: 35 },
      { id: "large", label: "1 kg", price: 120 },
    ]);
  });

  it("normalizes persisted variants and selects the requested size", () => {
    const variants = normalizeProductVariants([
      { id: "half", label: "500 g", price: 60.005 },
      { id: "one", label: "1 kg", price: 120 },
    ]);
    expect(variants).toEqual([
      { id: "half", label: "500 g", price: 60.01 },
      { id: "one", label: "1 kg", price: 120 },
    ]);
    expect(selectedProductVariant(variants, "one")).toEqual({ id: "one", label: "1 kg", price: 120 });
    expect(selectedProductVariant(variants, "missing")).toEqual(variants[0]);
  });

  it("keeps different pack sizes as separate cart lines and calculates totals", () => {
    expect(variantLineKey("masur-dal", "500g")).not.toBe(variantLineKey("masur-dal", "1kg"));
    expect(variantLineKey("masur-dal")).toBe(variantLineKey("masur-dal", "base"));
    expect(variantTotal(60, 3)).toBe(180);
  });
});
