import { describe, expect, it } from "vitest";

import { isPaymentMethodAvailable } from "../shared/payment-availability";

describe("payment availability", () => {
  it("keeps cash on delivery available regardless of optional toggles", () => {
    expect(isPaymentMethodAvailable("Cash on delivery", { upiEnabled: false, nivCreditEnabled: false })).toBe(true);
  });

  it("allows UPI and NIV Credit to be controlled independently", () => {
    expect(isPaymentMethodAvailable("UPI", { upiEnabled: false, nivCreditEnabled: true })).toBe(false);
    expect(isPaymentMethodAvailable("NIV Credit", { upiEnabled: false, nivCreditEnabled: true })).toBe(true);
    expect(isPaymentMethodAvailable("UPI", { upiEnabled: true, nivCreditEnabled: false })).toBe(true);
    expect(isPaymentMethodAvailable("NIV Credit", { upiEnabled: true, nivCreditEnabled: false })).toBe(false);
  });

  it("keeps legacy stores enabled when flags are absent", () => {
    expect(isPaymentMethodAvailable("UPI", {})).toBe(true);
    expect(isPaymentMethodAvailable("NIV Credit", {})).toBe(true);
  });
});
