import type { CartLine, Product } from "@/lib/niv-store";

export type OrderItemDetail = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  icon: string;
};

export function orderItemDetails(items: CartLine[], getProduct: (productId: string) => Product | undefined): OrderItemDetail[] {
  return items.map((line) => {
    const product = getProduct(line.productId);
    const unitPrice = line.unitPrice ?? product?.price ?? 0;
    return {
      productId: line.productId,
      name: line.productName ?? product?.name ?? "Grocery item",
      unit: line.unit ?? product?.unit ?? "Pack size not added",
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      icon: product?.icon ?? "🛍️",
    };
  });
}
