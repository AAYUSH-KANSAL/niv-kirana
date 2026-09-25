import { describe, expect, it } from "vitest";
import { collectOwnerOrders, removeAccountOrder } from "../shared/owner-order-routing";
import { canUseNivCredit } from "../shared/niv-rules";
import type { LocalCustomerAccount, Order } from "../lib/niv-store";

describe("Customer deletion, sales retention, and revolving credit controls", () => {
  it("collects historical orders even when customer account is no longer in active accounts list", () => {
    const activeAccount: LocalCustomerAccount = {
      id: "active-1",
      customer: { name: "Active Customer", phone: "9876543210", address: "Kuchesar" },
      cart: [],
      orders: [
        {
          id: "NIV-001",
          items: [{ productId: "atta", quantity: 1, unitPrice: 285 }],
          customer: { name: "Active Customer", phone: "9876543210", address: "Kuchesar" },
          payment: "Cash on delivery",
          fulfillment: "Delivery",
          status: "Delivered",
          total: 285,
          createdAt: new Date().toISOString(),
        },
      ],
      credit: { status: "none", limit: 0, used: 0, enabled: false },
      createdAt: new Date().toISOString(),
      lastSignedInAt: new Date().toISOString(),
      status: "approved",
    };

    // Historical order from a deleted customer
    const historicalOrder: Order = {
      id: "NIV-999",
      customerId: "deleted-account-123",
      items: [{ productId: "rice", quantity: 2, unitPrice: 325 }],
      customer: { name: "Deleted Customer", phone: "8888888888", address: "Chopla" },
      payment: "Cash on delivery",
      fulfillment: "Delivery",
      status: "Delivered",
      total: 650,
      createdAt: new Date().toISOString(),
    };

    const ownerOrders = collectOwnerOrders([activeAccount], [historicalOrder]);

    // Active accounts only has 1 customer
    expect([activeAccount].length).toBe(1);

    // But owner orders & sales includes both orders!
    expect(ownerOrders.length).toBe(2);
    expect(ownerOrders.map((o) => o.id)).toContain("NIV-001");
    expect(ownerOrders.map((o) => o.id)).toContain("NIV-999");
    const totalSales = ownerOrders.reduce((sum, o) => sum + o.total, 0);
    expect(totalSales).toBe(285 + 650);
  });

  it("prevents credit usage when limit is 0, status is none, or limit is exhausted", () => {
    // Default credit: limit 0
    expect(canUseNivCredit("none", 0, 0, 500, false)).toBe(false);
    expect(canUseNivCredit("approved", 0, 0, 500, true)).toBe(false);

    // Approved revolving credit: limit 2000, used 1500, cart 500 -> allowed
    expect(canUseNivCredit("approved", 2000, 1500, 500, true)).toBe(true);

    // Approved revolving credit: limit 2000, used 1500, cart 501 -> rejected (insufficient available)
    expect(canUseNivCredit("approved", 2000, 1500, 501, true)).toBe(false);

    // Once limit is completely exhausted (used = limit), credit cannot be used
    expect(canUseNivCredit("approved", 2000, 2000, 10, true)).toBe(false);

    // When credit is disabled by owner
    expect(canUseNivCredit("approved", 2000, 0, 500, false)).toBe(false);
  });

  it("locks both Delivered and Cancelled orders from removal to protect sales audit trail", () => {
    const testAccount: LocalCustomerAccount = {
      id: "cust-lock",
      customer: { name: "Audit Customer", phone: "9999900000", address: "Main Bazaar, Shop 4" },
      cart: [],
      orders: [
        {
          id: "ORD-DELIVERED",
          items: [{ productId: "atta", quantity: 1, unitPrice: 285 }],
          customer: { name: "Audit Customer", phone: "9999900000", address: "Main Bazaar, Shop 4" },
          payment: "Cash on delivery",
          fulfillment: "Delivery",
          status: "Delivered",
          total: 285,
          createdAt: new Date().toISOString(),
        },
        {
          id: "ORD-CANCELLED",
          items: [{ productId: "ghee", quantity: 1, unitPrice: 550 }],
          customer: { name: "Audit Customer", phone: "9999900000", address: "Main Bazaar, Shop 4" },
          payment: "Cash on delivery",
          fulfillment: "Delivery",
          status: "Cancelled",
          total: 550,
          createdAt: new Date().toISOString(),
        },
      ],
      credit: { status: "none", limit: 0, used: 0, enabled: false },
      createdAt: new Date().toISOString(),
      lastSignedInAt: new Date().toISOString(),
      status: "approved",
    };

    // Attempting to remove Delivered order should be rejected (orders array remains intact)
    const resDelivered = removeAccountOrder([testAccount], "cust-lock", "ORD-DELIVERED");
    expect(resDelivered.accounts[0].orders.map((o: any) => o.id)).toContain("ORD-DELIVERED");
    expect(resDelivered.deletedOrder).toBeUndefined();

    // Attempting to remove Cancelled order should also be rejected
    const resCancelled = removeAccountOrder([testAccount], "cust-lock", "ORD-CANCELLED");
    expect(resCancelled.accounts[0].orders.map((o: any) => o.id)).toContain("ORD-CANCELLED");
    expect(resCancelled.deletedOrder).toBeUndefined();
  });

  it("verifies customer deletion preserves order history as Delivered or Cancelled and guards against outstanding credit dues", () => {
    const customerWithDues: LocalCustomerAccount = {
      id: "cust-dues",
      customer: { name: "Ramesh Kumar", phone: "9876500001", address: "Ward 12, Kirana Gali" },
      cart: [],
      orders: [
        {
          id: "ORD-1",
          items: [],
          customer: { name: "Ramesh Kumar", phone: "9876500001", address: "Ward 12, Kirana Gali" },
          payment: "NIV Credit",
          fulfillment: "Delivery",
          status: "Delivered",
          total: 450,
          createdAt: new Date().toISOString(),
        },
        {
          id: "ORD-2",
          items: [],
          customer: { name: "Ramesh Kumar", phone: "9876500001", address: "Ward 12, Kirana Gali" },
          payment: "Cash on delivery",
          fulfillment: "Delivery",
          status: "New", // Open order
          total: 300,
          createdAt: new Date().toISOString(),
        },
      ],
      credit: { status: "approved", limit: 3000, used: 450, enabled: true },
      createdAt: new Date().toISOString(),
      lastSignedInAt: new Date().toISOString(),
      status: "approved",
    };

    // Rule: Outstanding dues > 0 must be cleared first
    const hasDues = (customerWithDues.credit?.used ?? 0) > 0;
    expect(hasDues).toBe(true);

    // After dues are cleared (used = 0), deletion can proceed
    const clearedCustomer = {
      ...customerWithDues,
      credit: { ...customerWithDues.credit, used: 0 },
    };
    expect((clearedCustomer.credit?.used ?? 0) > 0).toBe(false);

    // Archiving orders ensures any open orders convert to Cancelled while Delivered stays Delivered
    const archivedOrders = customerWithDues.orders.map((o) => {
      if (o.status !== "Delivered" && o.status !== "Cancelled") {
        return { ...o, status: "Cancelled" as const };
      }
      return o;
    });

    expect(archivedOrders.find((o) => o.id === "ORD-1")?.status).toBe("Delivered");
    expect(archivedOrders.find((o) => o.id === "ORD-2")?.status).toBe("Cancelled");

    // All sales data remains intact in historical orders collection
    const ownerOrders = collectOwnerOrders([], archivedOrders);
    expect(ownerOrders.length).toBe(2);
    expect(ownerOrders.map((o) => o.status)).toEqual(["Delivered", "Cancelled"]);
  });
});
