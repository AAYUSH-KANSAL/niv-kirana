import { describe, expect, it } from "vitest";

import { DEFAULT_UNAVAILABLE_REASON, revisedOrderTotal, unavailableItemFromLine } from "../shared/order-revision";

describe("order revision", () => {
  it("removes unavailable line value from the revised payable total", () => {
    const availableItems = [{ productId: "atta", productName: "Atta", unit: "5 kg", quantity: 1, unitPrice: 285 }, { productId: "sugar", productName: "Sugar", unit: "1 kg", quantity: 1, unitPrice: 49 }];
    expect(revisedOrderTotal(availableItems)).toBe(334);
  });

  it("keeps an unavailable item snapshot and customer message", () => {
    expect(unavailableItemFromLine({ productId: "rice", productName: "Premium Rice", unit: "5 kg", quantity: 2, unitPrice: 325 })).toMatchObject({ productName: "Premium Rice", lineTotal: 650, reason: DEFAULT_UNAVAILABLE_REASON });
  });
});
