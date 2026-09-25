import { describe, expect, it } from "vitest";

import type { OwnerOrder } from "../shared/owner-order-routing";
import { summarizeOwnerOrders } from "../shared/owner-order-customers";

function order(id: string, accountId: string, createdAt: string, overrides: Partial<OwnerOrder> = {}): OwnerOrder {
  return { id, accountId, customer: { name: "Nishant", phone: "7060902859", address: "NIV Nagar" }, items: [], total: 0, payment: "Cash on delivery", status: "New", createdAt, ...overrides } as OwnerOrder;
}

describe("owner customer order summaries", () => {
  it("groups each customer separately and sorts their orders newest first", () => {
    const summaries = summarizeOwnerOrders([
      order("OLD", "customer-1", "2026-08-27T10:00:00.000Z"),
      order("OTHER", "customer-2", "2026-08-29T09:00:00.000Z", { customer: { name: "Rohan", phone: "7000000000", address: "Market" } }),
      order("NEW", "customer-1", "2026-08-29T12:00:00.000Z"),
    ]);

    expect(summaries.map((summary) => summary.accountId)).toEqual(["customer-1", "customer-2"]);
    expect(summaries[0].orders.map((item) => item.id)).toEqual(["NEW", "OLD"]);
    expect(summaries[0].latestCreatedAt).toBe("2026-08-29T12:00:00.000Z");
    expect(summaries[1].name).toBe("Rohan");
  });

  it("counts voice orders without separating them from the customer's normal order list", () => {
    const summaries = summarizeOwnerOrders([
      order("VOICE", "customer-1", "2026-08-29T12:00:00.000Z", { audioUri: "file:///voice.m4a" }),
      order("NORMAL", "customer-1", "2026-08-28T12:00:00.000Z"),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0].orders.map((item) => item.id)).toEqual(["VOICE", "NORMAL"]);
    expect(summaries[0].voiceOrderCount).toBe(1);
  });
});
