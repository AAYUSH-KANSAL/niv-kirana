import { describe, expect, it } from "vitest";

import { paymentForFulfillment, fulfillmentLabel, requiresDeliveryDetails } from "../shared/order-fulfillment";
import { collectOwnerOrders, removeAccountOrder } from "../shared/owner-order-routing";
import type { LocalCustomerAccount } from "../lib/niv-store";

describe("order fulfillment", () => {
  it("maps self pickup to Cash Purchasing and skips delivery details", () => {
    expect(paymentForFulfillment("Self Pickup", "UPI")).toBe("Cash Purchasing");
    expect(requiresDeliveryDetails("Self Pickup")).toBe(false);
    expect(fulfillmentLabel("Self Pickup")).toBe("Self Pickup");
  });

  it("keeps delivery payment and address requirements unchanged", () => {
    expect(paymentForFulfillment("Delivery", "Cash on delivery")).toBe("Cash on delivery");
    expect(requiresDeliveryDetails("Delivery")).toBe(true);
    expect(fulfillmentLabel(undefined)).toBe("Delivery");
  });
});

describe("owner order deletion", () => {
  it("removes only the targeted order and returns its snapshot", () => {
    const accounts = [
      { id: "a", customer: { name: "Nishant", phone: "9999999999", address: "Village" }, cart: [], orders: [{ id: "keep", items: [], customer: { name: "Nishant", phone: "9999999999", address: "Village" }, payment: "Cash on delivery", status: "New", total: 40, createdAt: "2026-08-28T00:00:00.000Z" }, { id: "delete", items: [], customer: { name: "Nishant", phone: "9999999999", address: "Village" }, payment: "Cash Purchasing", fulfillment: "Self Pickup", status: "New", total: 60, createdAt: "2026-08-28T00:01:00.000Z" }], credit: { status: "none", limit: 0, used: 0 }, createdAt: "2026-08-27T00:00:00.000Z", lastSignedInAt: "2026-08-28T00:00:00.000Z" },
    ] as LocalCustomerAccount[];
    const result = removeAccountOrder(accounts, "a", "delete");
    expect(result.deletedOrder?.id).toBe("delete");
    expect(result.accounts[0].orders.map((order) => order.id)).toEqual(["keep"]);
    expect(collectOwnerOrders(result.accounts).map((order) => order.id)).toEqual(["keep"]);
    expect(removeAccountOrder(result.accounts, "a", "missing").deletedOrder).toBeUndefined();
  });

  it("never deletes delivered orders from customer records", () => {
    const accounts = [
      {
        id: "a",
        customer: { name: "Nishant", phone: "9999999999", address: "Village" },
        cart: [],
        orders: [
          {
            id: "delivered-order",
            items: [],
            customer: { name: "Nishant", phone: "9999999999", address: "Village" },
            payment: "Cash on delivery",
            status: "Delivered",
            total: 150,
            createdAt: "2026-08-28T00:00:00.000Z",
          },
        ],
        credit: { status: "none", limit: 0, used: 0 },
        createdAt: "2026-08-27T00:00:00.000Z",
        lastSignedInAt: "2026-08-28T00:00:00.000Z",
      },
    ] as LocalCustomerAccount[];
    const result = removeAccountOrder(accounts, "a", "delivered-order");
    expect(result.deletedOrder).toBeUndefined();
    expect(result.accounts[0].orders).toHaveLength(1);
    expect(result.accounts[0].orders[0].id).toBe("delivered-order");
  });
});
