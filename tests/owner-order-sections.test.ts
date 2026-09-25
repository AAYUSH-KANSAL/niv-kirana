import { describe, expect, it } from "vitest";

import { groupOrdersByDate, splitOrdersByDay } from "../shared/owner-order-sections";

const baseOrder = { items: [], customer: { name: "Nishant", phone: "9876543210", address: "Main Road" }, payment: "Cash on delivery" as const, status: "New" as const, total: 285 };

describe("owner order sections", () => {
  it("separates today’s orders from previous-day orders", () => {
    const result = splitOrdersByDay([
      { ...baseOrder, id: "NIV-TODAY", createdAt: "2026-08-26T08:00:00.000Z" },
      { ...baseOrder, id: "NIV-OLD", createdAt: "2026-08-25T08:00:00.000Z" },
    ], new Date("2026-08-26T12:00:00.000Z"));
    expect(result.current.map((order) => order.id)).toEqual(["NIV-TODAY"]);
    expect(result.previous.map((order) => order.id)).toEqual(["NIV-OLD"]);
  });

  it("keeps legacy orders without a saved date accessible in current orders", () => {
    const result = splitOrdersByDay([{ ...baseOrder, id: "NIV-LEGACY", createdAt: "Just now" }], new Date("2026-08-26T12:00:00.000Z"));
    expect(result.current).toHaveLength(1);
  });

  it("collects previous orders under their individual calendar dates", () => {
    const groups = groupOrdersByDate([
      { ...baseOrder, id: "NIV-1", createdAt: "2026-08-24T08:00:00.000Z" },
      { ...baseOrder, id: "NIV-2", createdAt: "2026-08-24T16:00:00.000Z" },
      { ...baseOrder, id: "NIV-3", createdAt: "2026-08-23T08:00:00.000Z" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].orders).toHaveLength(2);
  });
});
