import { describe, expect, it } from "vitest";

import { calculateOrderTotal, canUseNivCredit } from "../shared/niv-rules";

describe("NIV checkout rules", () => {
  it("totals only valid products and positive quantities", () => {
    const total = calculateOrderTotal(
      [{ productId: "atta", quantity: 2 }, { productId: "milk", quantity: 3 }, { productId: "unknown", quantity: 5 }, { productId: "milk", quantity: -2 }],
      [{ id: "atta", price: 285 }, { id: "milk", price: 34 }],
    );
    expect(total).toBe(672);
  });

  it("allows credit only when owner approval and available balance cover the order", () => {
    expect(canUseNivCredit("approved", 2000, 400, 1200)).toBe(true);
    expect(canUseNivCredit("approved", 2000, 400, 1200, false)).toBe(false);
    expect(canUseNivCredit("requested", 2000, 0, 500)).toBe(false);
    expect(canUseNivCredit("approved", 1000, 700, 500)).toBe(false);
  });
});
