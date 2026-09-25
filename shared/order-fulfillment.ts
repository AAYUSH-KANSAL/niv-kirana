export type FulfillmentMethod = "Delivery" | "Self Pickup";
export type CheckoutPaymentMethod = "Cash on delivery" | "UPI" | "NIV Credit" | "Cash Purchasing";

export function paymentForFulfillment(fulfillment: FulfillmentMethod, deliveryPayment: Exclude<CheckoutPaymentMethod, "Cash Purchasing">): CheckoutPaymentMethod {
  return fulfillment === "Self Pickup" ? "Cash Purchasing" : deliveryPayment;
}

export function fulfillmentLabel(fulfillment: FulfillmentMethod | undefined): string {
  return fulfillment === "Self Pickup" ? "Self Pickup" : "Delivery";
}

export function requiresDeliveryDetails(fulfillment: FulfillmentMethod): boolean {
  return fulfillment === "Delivery";
}
