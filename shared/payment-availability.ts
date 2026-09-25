import type { PaymentMethod } from "../lib/niv-store";

export type PaymentAvailabilitySettings = {
  upiEnabled?: boolean;
  nivCreditEnabled?: boolean;
};

/**
 * Cash on delivery and cash purchasing are always available. Optional methods
 * default to enabled so existing saved stores keep their current behavior.
 */
export function isPaymentMethodAvailable(
  method: PaymentMethod,
  settings: PaymentAvailabilitySettings,
) {
  if (method === "UPI") return settings.upiEnabled !== false;
  if (method === "NIV Credit") return settings.nivCreditEnabled !== false;
  return true;
}
