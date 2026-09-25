import { describe, expect, it } from "vitest";

import { orderItemDetails } from "../shared/order-item-details";

describe("order item details", () => {
  it("uses the saved item snapshot for clear packing and billing rows", () => {
    const details = orderItemDetails([{ productId: "rice", quantity: 2, productName: "Premium Rice", unit: "5 kg", unitPrice: 325 }], () => ({ id: "rice", name: "Changed Rice", category: "Staples", price: 400, unit: "1 kg", stock: 8, icon: "🍚" }));
    expect(details[0]).toMatchObject({ name: "Premium Rice", unit: "5 kg", quantity: 2, unitPrice: 325, lineTotal: 650, icon: "🍚" });
  });
});
