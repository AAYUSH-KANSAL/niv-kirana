export const DEFAULT_CATALOG_CATEGORIES = ["All", "Staples", "Pulses", "Dairy", "Fresh", "Snacks", "Home care", "Personal care", "Beverages"] as const;

export function usableCatalogCategories(categories?: readonly string[] | string[]) {
  const cleaned = (categories ?? []).map((category) => category.trim()).filter(Boolean);
  const withoutAll = cleaned.filter((category) => category.toLowerCase() !== "all");
  return ["All", ...Array.from(new Set(withoutAll))];
}

export function addCatalogCategory(categories: readonly string[] | string[], next: string) {
  const trimmed = next.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return usableCatalogCategories(categories);
  const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const cleaned = (categories ?? []).map((c) => c.trim()).filter(Boolean);
  if (cleaned.some((c) => c.toLowerCase() === formatted.toLowerCase())) {
    return usableCatalogCategories(cleaned);
  }
  return usableCatalogCategories([...cleaned, formatted]);
}

export function renameCatalogCategory(categories: string[], current: string, next: string) {
  const renamed = next.trim();
  if (!renamed || renamed.toLowerCase() === "all") return categories;
  return categories.map((category) => category === current ? renamed : category);
}

export function removeCatalogCategory(categories: string[], category: string) {
  if (category === "All") return categories;
  return categories.filter((item) => item !== category);
}

