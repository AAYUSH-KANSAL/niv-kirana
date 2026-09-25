import { describe, expect, it } from "vitest";

import type { Product } from "../lib/niv-store";
import { relatedProductsFor, relatedProductsLabel } from "../lib/product-recommendations";

const product = (id: string, name: string, category = "Staples"): Product => ({ id, name, category, price: 10, unit: "1 pack", stock: 10, icon: "📦" });

describe("product recommendations", () => {
  it("keeps spice recommendations with Haldi even when owner used a general category", () => {
    const haldi = product("haldi", "Haldi Powder");
    const results = relatedProductsFor(haldi, [haldi, product("mirch", "Lal Mirch"), product("dhaniya", "Dhaniya Powder"), product("masala", "Garam Masala"), product("atta", "Aashirvaad Atta")]);
    expect(results.map((item) => item.id)).toEqual(["dhaniya", "masala", "mirch"]);
    expect(relatedProductsLabel(haldi)).toBe("Spices that go well together");
  });

  it("uses the matching catalog category for non-spice products", () => {
    const milk = product("milk", "Fresh Milk", "Dairy");
    const results = relatedProductsFor(milk, [milk, product("curd", "Fresh Curd", "Dairy"), product("atta", "Atta", "Staples")]);
    expect(results.map((item) => item.id)).toEqual(["curd"]);
    expect(relatedProductsLabel(milk)).toBe("More from Dairy");
  });
});

