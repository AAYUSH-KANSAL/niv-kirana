export type FeaturedProductRecord = { id: string; featured?: boolean };

export function featuredProductIds(products: FeaturedProductRecord[], selectedIds?: string[]) {
  const allowed = new Set(products.map((product) => product.id));
  const ids = selectedIds?.length ? selectedIds.filter((id) => allowed.has(id)) : products.filter((product) => product.featured).map((product) => product.id);
  return ids;
}

export function selectFeaturedProducts<T extends FeaturedProductRecord>(products: T[], selectedIds?: string[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return featuredProductIds(products, selectedIds).map((id) => byId.get(id)).filter((product): product is T => Boolean(product));
}

export function toggleFeaturedProductId(selectedIds: string[], productId: string) {
  return selectedIds.includes(productId) ? selectedIds.filter((id) => id !== productId) : [...selectedIds, productId];
}
