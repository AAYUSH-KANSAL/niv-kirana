export function quantityForCart(requestedQuantity: number, availableStock: number) {
  const stock = Math.max(0, Math.floor(availableStock));
  if (stock === 0) return 0;
  return Math.min(stock, Math.max(1, Math.floor(requestedQuantity)));
}
