import type { CartLine } from "@/lib/niv-store";

export function changeFestivalQuantity(currentQuantity: number, delta: number, availableStock: number) {
  return Math.max(1, Math.min(Math.max(1, availableStock), currentQuantity + delta));
}

export function festivalBasketTotal(items: CartLine[], getPrice: (productId: string) => number) {
  return items.reduce((total, item) => total + getPrice(item.productId) * item.quantity, 0);
}
