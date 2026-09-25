import { describe, expect, it } from "vitest";

import { quantityForCart } from "../shared/cart-quantity";

describe("NIV product quantity picker", () => {
  it("keeps a selected quantity within available stock", () => {
    expect(quantityForCart(3, 12)).toBe(3);
    expect(quantityForCart(20, 5)).toBe(5);
  });

  it("does not allow zero, negative, or out-of-stock quantities", () => {
    expect(quantityForCart(0, 7)).toBe(1);
    expect(quantityForCart(-4, 7)).toBe(1);
    expect(quantityForCart(2, 0)).toBe(0);
  });
});
