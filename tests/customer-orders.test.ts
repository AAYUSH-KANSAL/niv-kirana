import { describe, expect, it } from "vitest";

import type { Order } from "../lib/niv-store";
import { isPreviousCustomerOrder, splitCustomerOrders } from "../shared/customer-orders";

const order = (id: string, status: Order["status"]) => ({ id, status } as Order);

describe("customer order sections", () => {
  it("keeps new, payment-pending, packed and out-for-delivery orders active", () => {
    const result = splitCustomerOrders([
      order("new", "New"),
      order("payment", "Payment pending"),
      order("packed", "Packed"),
      order("out", "Out for delivery"),
    ]);

    expect(result.current.map((item) => item.id)).toEqual(["new", "payment", "packed", "out"]);
    expect(result.previous).toHaveLength(0);
  });

  it("moves delivered and cancelled orders to Previous Orders immediately", () => {
    const result = splitCustomerOrders([
      order("active", "Packed"),
      order("delivered", "Delivered"),
      order("cancelled", "Cancelled"),
    ]);

    expect(result.current.map((item) => item.id)).toEqual(["active"]);
    expect(result.previous.map((item) => item.id)).toEqual(["delivered", "cancelled"]);
    expect(result.delivered.map((item) => item.id)).toEqual(["delivered"]);
    expect(result.cancelled.map((item) => item.id)).toEqual(["cancelled"]);
    expect(isPreviousCustomerOrder(order("delivered", "Delivered"))).toBe(true);
    expect(isPreviousCustomerOrder(order("cancelled", "Cancelled"))).toBe(true);
    expect(isPreviousCustomerOrder(order("packed", "Packed"))).toBe(false);
  });

  it("splits active into all in-progress stages like packed, out for delivery, and new", () => {
    const orders = [
      order("ord-new", "New"),
      order("ord-packed", "Packed"),
      order("ord-out", "Out for delivery"),
      order("ord-delivered", "Delivered"),
      order("ord-cancelled", "Cancelled"),
    ];

    const { current, delivered, cancelled } = splitCustomerOrders(orders);
    expect(current.map((o) => o.id)).toEqual(["ord-new", "ord-packed", "ord-out"]);
    expect(delivered.map((o) => o.id)).toEqual(["ord-delivered"]);
    expect(cancelled.map((o) => o.id)).toEqual(["ord-cancelled"]);
  });
});
