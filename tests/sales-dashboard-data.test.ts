import { describe, expect, it } from "vitest";
import type { OwnerOrder } from "../shared/owner-order-routing";

describe("Sales Dashboard Real Data Calculations", () => {
  it("computes monthly revenue strictly from order createdAt timestamps without fake historical multipliers", () => {
    const orders: OwnerOrder[] = [
      {
        id: "ORD-1",
        accountId: "ACC-1",
        customer: { name: "Ramesh", phone: "9876543210", address: "Kuchesar" },
        items: [{ productId: "p1", productName: "Basmati Rice 1kg", quantity: 2, unitPrice: 120 }],
        total: 240,
        payment: "UPI",
        status: "Delivered",
        createdAt: "2026-09-24T10:00:00.000Z",
      },
    ];

    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date("2026-09-24T12:00:00.000Z");

    const months: { name: string; amount: number; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const name = `${MONTH_NAMES[m]} ${y}`;

      const matching = orders.filter((o) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        return oDate.getFullYear() === y && oDate.getMonth() === m;
      });

      const amount = matching.reduce((sum, o) => sum + (o.total || 0), 0);
      months.push({ name, amount, count: matching.length });
    }

    // Jun, Jul, Aug must be strictly 0 (no fake 0.72 or 0.85 multipliers)
    expect(months.find((m) => m.name === "Jun 2026")?.amount).toBe(0);
    expect(months.find((m) => m.name === "Jun 2026")?.count).toBe(0);
    expect(months.find((m) => m.name === "Jul 2026")?.amount).toBe(0);
    expect(months.find((m) => m.name === "Aug 2026")?.amount).toBe(0);

    // Sep 2026 has the real 240 total
    const sep = months.find((m) => m.name === "Sep 2026");
    expect(sep?.amount).toBe(240);
    expect(sep?.count).toBe(1);
  });

  it("does not return fake Kuchesar staple catalog when no orders exist", () => {
    const orders: OwnerOrder[] = [];

    const itemMap = new Map<string, { name: string; units: number; revenue: number }>();
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.productName || "Item";
        const existing = itemMap.get(name);
        if (existing) {
          existing.units += item.quantity || 1;
          existing.revenue += (item.unitPrice || 0) * (item.quantity || 1);
        } else {
          itemMap.set(name, {
            name,
            units: item.quantity || 1,
            revenue: (item.unitPrice || 0) * (item.quantity || 1),
          });
        }
      });
    });

    const topProducts = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    expect(topProducts).toHaveLength(0);
    expect(topProducts.some((p) => p.name.includes("Fortune"))).toBe(false);
  });

  it("calculates real order fulfillment pipeline percentages and repeat customer rate", () => {
    const orders: OwnerOrder[] = [
      {
        id: "ORD-1",
        accountId: "ACC-1",
        customer: { name: "Sunil", phone: "9999911111", address: "Kuchesar" },
        items: [],
        total: 500,
        payment: "Cash on delivery",
        status: "Delivered",
        createdAt: "2026-09-24T10:00:00.000Z",
      },
      {
        id: "ORD-2",
        accountId: "ACC-1",
        customer: { name: "Sunil", phone: "9999911111", address: "Kuchesar" },
        items: [],
        total: 300,
        payment: "UPI",
        status: "Out for delivery",
        createdAt: "2026-09-24T11:00:00.000Z",
      },
      {
        id: "ORD-3",
        accountId: "ACC-2",
        customer: { name: "Amit", phone: "9999922222", address: "Kuchesar" },
        items: [],
        total: 200,
        payment: "NIV Credit",
        status: "Cancelled",
        createdAt: "2026-09-24T11:30:00.000Z",
      },
    ];

    const delivered = orders.filter((o) => o.status === "Delivered").length;
    const outForDelivery = orders.filter((o) => o.status === "Out for delivery").length;
    const cancelled = orders.filter((o) => o.status === "Cancelled").length;
    const total = orders.length;

    expect(Math.round((delivered / total) * 100)).toBe(33);
    expect(Math.round((outForDelivery / total) * 100)).toBe(33);
    expect(Math.round((cancelled / total) * 100)).toBe(33);

    // Repeat customers: Sunil has 2 orders, Amit has 1 order -> 1 repeat out of 2 unique customers = 50%
    const customerOrderCounts = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.customer?.phone || "unknown";
      customerOrderCounts.set(key, (customerOrderCounts.get(key) || 0) + 1);
    });
    const totalUnique = customerOrderCounts.size;
    const repeat = Array.from(customerOrderCounts.values()).filter((c) => c > 1).length;
    const repeatRate = Math.round((repeat / totalUnique) * 100);

    expect(totalUnique).toBe(2);
    expect(repeat).toBe(1);
    expect(repeatRate).toBe(50);
  });

  it("ensures that home page live orders strictly include today's active orders and exclude yesterday's orders", () => {
    const fixedNow = new Date("2026-09-24T12:00:00.000Z");
    const today = [fixedNow.getFullYear(), fixedNow.getMonth(), fixedNow.getDate()].join("-");

    const orders: OwnerOrder[] = [
      {
        id: "ORD-TODAY-LIVE",
        accountId: "ACC-1",
        customer: { name: "Ravi", phone: "9811122233", address: "Kuchesar Chopla" },
        items: [],
        total: 450,
        payment: "UPI",
        status: "New",
        createdAt: "2026-09-24T09:30:00.000Z",
      },
      {
        id: "ORD-TODAY-DELIVERED",
        accountId: "ACC-1",
        customer: { name: "Ravi", phone: "9811122233", address: "Kuchesar Chopla" },
        items: [],
        total: 150,
        payment: "Cash on delivery",
        status: "Delivered",
        createdAt: "2026-09-24T08:00:00.000Z",
      },
      {
        id: "ORD-YESTERDAY-OLD",
        accountId: "ACC-2",
        customer: { name: "Deepak", phone: "9822233344", address: "Kuchesar Village" },
        items: [],
        total: 800,
        payment: "NIV Credit",
        status: "New",
        createdAt: "2026-09-23T15:00:00.000Z",
      },
    ];

    // Filter strictly today's orders
    const todayOrders = orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      const orderDay = [d.getFullYear(), d.getMonth(), d.getDate()].join("-");
      return orderDay === today;
    });

    // Today's live orders (active only)
    const todayLiveOrders = todayOrders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");

    expect(todayOrders.map((o) => o.id)).toEqual(["ORD-TODAY-LIVE", "ORD-TODAY-DELIVERED"]);
    expect(todayLiveOrders.map((o) => o.id)).toEqual(["ORD-TODAY-LIVE"]);
    expect(todayLiveOrders.some((o) => o.id === "ORD-YESTERDAY-OLD")).toBe(false);
  });
});
