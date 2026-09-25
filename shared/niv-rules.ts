export type BasketLine = { productId: string; quantity: number };
export type PricedProduct = { id: string; price: number };

export function calculateOrderTotal(lines: BasketLine[], products: PricedProduct[]) {
  const prices = new Map(products.map((product) => [product.id, product.price]));
  return lines.reduce((total, line) => total + (prices.get(line.productId) ?? 0) * Math.max(0, line.quantity), 0);
}

export function canUseNivCredit(status: string, limit: number, used: number, orderTotal: number, enabled = true) {
  return status === "approved" && enabled && Number.isFinite(orderTotal) && orderTotal > 0 && Math.max(0, limit - used) >= orderTotal;
}
