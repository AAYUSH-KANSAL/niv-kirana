export type UnavailableOrderItem = {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  reason: string;
};

type BillableLine = {
  productId: string;
  productName?: string;
  unit?: string;
  quantity: number;
  unitPrice?: number;
};

export const DEFAULT_UNAVAILABLE_REASON = "This product is not available for this time. Please order again later.";

export function revisedOrderTotal(items: BillableLine[]) {
  return items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.unitPrice) || 0), 0);
}

export function unavailableItemFromLine(item: BillableLine, reason = DEFAULT_UNAVAILABLE_REASON): UnavailableOrderItem {
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
  return {
    productId: item.productId,
    productName: item.productName?.trim() || "Grocery item",
    unit: item.unit?.trim() || "Pack not specified",
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
    reason: reason.trim() || DEFAULT_UNAVAILABLE_REASON,
  };
}
