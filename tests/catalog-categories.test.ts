import { describe, expect, it } from "vitest";

import { addCatalogCategory, removeCatalogCategory, renameCatalogCategory, usableCatalogCategories } from "../shared/catalog-categories";

describe("owner catalog categories", () => {
  it("normalizes categories with a single fixed All chip", () => {
    expect(usableCatalogCategories(["All", "Pulses", "Pulses", " ", "Dairy"])).toEqual(["All", "Pulses", "Dairy"]);
  });

  it("adds a new category cleanly without duplicates", () => {
    expect(addCatalogCategory(["All", "Pulses"], "Spices")).toEqual(["All", "Pulses", "Spices"]);
    expect(addCatalogCategory(["All", "Pulses"], "pulses")).toEqual(["All", "Pulses"]);
    expect(addCatalogCategory(["All", "Pulses"], "All")).toEqual(["All", "Pulses"]);
    expect(addCatalogCategory(["All", "Pulses"], "   ")).toEqual(["All", "Pulses"]);
  });

  it("allows the owner to rename a category without changing its position", () => {
    expect(renameCatalogCategory(["All", "Pulses", "Dairy"], "Pulses", "Dal aur pulses")).toEqual(["All", "Dal aur pulses", "Dairy"]);
  });

  it("does not remove the fixed All chip", () => {
    expect(removeCatalogCategory(["All", "Pulses"], "All")).toEqual(["All", "Pulses"]);
    expect(removeCatalogCategory(["All", "Pulses"], "Pulses")).toEqual(["All"]);
  });
});
