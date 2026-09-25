import { describe, expect, it } from "vitest";

import { collectOwnerOrders, confirmAccountOrder, isOrderConfirmed, updateAccountOrderStatus } from "../shared/owner-order-routing";

const accounts = [
  { id: "rohan", customer: { name: "Rohan", phone: "9876543210", address: "Village Road" }, cart: [], credit: { status: "none" as const, limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [{ id: "NIV-1001", items: [], customer: { name: "Rohan", phone: "9876543210", address: "Village Road" }, payment: "Cash on delivery" as const, status: "New" as const, total: 285, createdAt: "Just now" }] },
  { id: "pooja", customer: { name: "Pooja", phone: "9876543211", address: "Market Lane" }, cart: [], credit: { status: "none" as const, limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [{ id: "NIV-1002", items: [], customer: { name: "Pooja", phone: "9876543211", address: "Market Lane" }, payment: "Cash on delivery" as const, status: "New" as const, total: 610, createdAt: "Just now" }] },
];

describe("owner order routing", () => {
  it("shows every local customer order in the owner queue", () => {
    expect(collectOwnerOrders(accounts).map((order) => order.id)).toEqual(["NIV-1001", "NIV-1002"]);
  });

  it("updates only the customer order selected by the owner", () => {
    const updated = updateAccountOrderStatus(accounts, "pooja", "NIV-1002", "Packed");
    expect(updated[0].orders[0].status).toBe("New");
    expect(updated[1].orders[0].status).toBe("Packed");
  });

  it("confirms only the selected order and records a stable confirmation timestamp", () => {
    const confirmed = confirmAccountOrder(accounts, "pooja", "NIV-1002", "2026-08-28T10:00:00.000Z");
    expect(confirmed[0].orders[0].status).toBe("New");
    expect(confirmed[1].orders[0].status).toBe("Packed");
    expect(confirmed[1].orders[0].confirmedAt).toBe("2026-08-28T10:00:00.000Z");
    expect(isOrderConfirmed(confirmed[1].orders[0])).toBe(true);
    expect(isOrderConfirmed(confirmed[0].orders[0])).toBe(false);
  });
});
