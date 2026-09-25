import { describe, expect, it } from "vitest";

import { nextRecommendationQuantity, recommendationAddButtonLabel, recommendationButtonIcon, recommendationQuantityAfterDelta, recommendationQuantityLabel } from "../shared/recommendation-cart";

describe("recommendation add-to-cart action", () => {
  it("adds one recommended item without exceeding stock", () => {
    expect(nextRecommendationQuantity(0, 6)).toBe(1);
    expect(nextRecommendationQuantity(5, 6)).toBe(6);
    expect(nextRecommendationQuantity(6, 6)).toBe(6);
  });

  it("does not add an out-of-stock recommendation", () => {
    expect(nextRecommendationQuantity(0, 0)).toBe(0);
    expect(recommendationButtonIcon(false, false)).toBe("add");
  });

  it("supports minus, zero removal, and plus stock limits", () => {
    expect(recommendationQuantityAfterDelta(3, -1, 6)).toBe(2);
    expect(recommendationQuantityAfterDelta(1, -1, 6)).toBe(0);
    expect(recommendationQuantityAfterDelta(6, 1, 6)).toBe(6);
    expect(recommendationQuantityAfterDelta(2, 1, 0)).toBe(0);
  });

  it("labels the adjacent cart action clearly", () => {
    expect(recommendationAddButtonLabel(0)).toBe("Add to cart");
    expect(recommendationAddButtonLabel(2)).toBe("Add to cart");
  });

  it("shows a check icon and current quantity after a successful in-stock add", () => {
    expect(recommendationButtonIcon(false, true)).toBe("add");
    expect(recommendationButtonIcon(true, true)).toBe("check");
    expect(recommendationQuantityLabel(0)).toBe("");
    expect(recommendationQuantityLabel(1)).toBe("1");
    expect(recommendationQuantityLabel(3)).toBe("3");
  });
});
