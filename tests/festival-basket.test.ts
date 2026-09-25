import { describe, expect, it } from "vitest";

import { changeFestivalQuantity, festivalBasketTotal } from "../shared/festival-basket";

describe("NIV festival basket editing", () => {
  it("keeps edited quantities within stock limits", () => {
    expect(changeFestivalQuantity(1, -1, 8)).toBe(1);
    expect(changeFestivalQuantity(2, 3, 4)).toBe(4);
  });

  it("calculates the customer basket total from editable items", () => {
    expect(festivalBasketTotal([{ productId: "tea", quantity: 2 }, { productId: "sugar", quantity: 1 }], (id) => id === "tea" ? 145 : 49)).toBe(339);
  });
});
