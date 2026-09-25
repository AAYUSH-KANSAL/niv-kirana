import { describe, expect, it } from "vitest";

import { formatProductUnit, splitProductUnit } from "../shared/product-units";

describe("product unit editor helpers", () => {
  it("reads supported pack sizes for editable products", () => {
    expect(splitProductUnit("5 kg")).toEqual({ amount: "5", unit: "kg" });
    expect(splitProductUnit("500 ml")).toEqual({ amount: "500", unit: "ml" });
  });

  it("uses a safe piece fallback and formats the selected unit", () => {
    expect(splitProductUnit("pack")).toEqual({ amount: "1", unit: "piece" });
    expect(formatProductUnit("2", "litre")).toBe("2 litre");
    expect(formatProductUnit("0", "packet")).toBe("1 packet");
  });
});
