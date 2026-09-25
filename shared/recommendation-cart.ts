export function nextRecommendationQuantity(currentQuantity: number, stock: number) {
  if (stock <= 0) return 0;
  return Math.min(Math.max(0, currentQuantity) + 1, stock);
}

export function recommendationButtonIcon(added: boolean, inStock: boolean) {
  if (!inStock) return "add" as const;
  return added ? "check" as const : "add" as const;
}

export function recommendationQuantityLabel(quantity: number) {
  return quantity > 0 ? String(quantity) : "";
}

export function recommendationQuantityAfterDelta(currentQuantity: number, delta: number, stock: number) {
  if (stock <= 0) return 0;
  return Math.max(0, Math.min(Math.max(0, currentQuantity) + delta, stock));
}

export function recommendationAddButtonLabel(_quantity: number) {
  return "Add to cart";
}
