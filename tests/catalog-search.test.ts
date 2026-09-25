import { describe, expect, it } from "vitest";

import { fallbackCatalogMatches, filterOwnerCatalogProducts, productMatchesCatalogSearch, sanitizeCatalogSearchMatches } from "../shared/catalog-search";

const products = [
  { name: "Rajma", category: "Pulses", unit: "1 kg" },
  { name: "Premium Rice", category: "Staples", unit: "5 kg" },
  { name: "Fresh Milk", category: "Dairy", unit: "500 ml" },
];

describe("owner catalog search", () => {
  it("finds a product from its name regardless of typing case", () => {
    expect(filterOwnerCatalogProducts(products, "RAJMA").map((product) => product.name)).toEqual(["Rajma"]);
  });

  it("can find products from category and pack size", () => {
    expect(filterOwnerCatalogProducts(products, "pulses").map((product) => product.name)).toEqual(["Rajma"]);
    expect(filterOwnerCatalogProducts(products, "5 kg").map((product) => product.name)).toEqual(["Premium Rice"]);
  });

  it("keeps the full product list until a query is entered", () => {
    expect(filterOwnerCatalogProducts(products, " ")).toHaveLength(3);
    expect(filterOwnerCatalogProducts(products, "oil")).toHaveLength(0);
  });

  it("matches local and alternate grocery names for customer search", () => {
    expect(productMatchesCatalogSearch(products[0], "red kidney beans")).toBe(true);
    expect(productMatchesCatalogSearch(products[0], "rajmaa")).toBe(true);
    expect(productMatchesCatalogSearch(products[1], "chawal")).toBe(true);
    expect(productMatchesCatalogSearch(products[2], "doodh")).toBe(true);
  });

  it("creates safe fallback matches when AI is unavailable", () => {
    expect(fallbackCatalogMatches(products.map((product, index) => ({ ...product, id: String(index) })), "red kidney beans")).toEqual([{ productId: "0", confidence: "medium" }]);
  });

  it("drops unknown and duplicate AI product IDs", () => {
    expect(sanitizeCatalogSearchMatches([{ id: "rajma" }, { id: "rice" }], [{ productId: "rajma", confidence: "high" }, { productId: "unknown", confidence: "high" }, { productId: "rajma", confidence: "medium" }])).toEqual([{ productId: "rajma", confidence: "high" }]);
  });
});
