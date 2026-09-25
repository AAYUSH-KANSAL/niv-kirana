import type { Order } from "@/lib/niv-store";

export function splitCustomerOrders(orders: Order[] = []) {
  const safeOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];
  return {
    current: safeOrders.filter((order) => {
      const s = String(order?.status || "").toLowerCase();
      return s !== "delivered" && s !== "cancelled" && s !== "completed";
    }),
    previous: safeOrders.filter((order) => {
      const s = String(order?.status || "").toLowerCase();
      return s === "delivered" || s === "cancelled" || s === "completed";
    }),
    delivered: safeOrders.filter((order) => {
      const s = String(order?.status || "").toLowerCase();
      return s === "delivered" || s === "completed";
    }),
    cancelled: safeOrders.filter((order) => {
      const s = String(order?.status || "").toLowerCase();
      return s === "cancelled";
    }),
  };
}

export function isPreviousCustomerOrder(order: Order) {
  const s = String(order?.status || "").toLowerCase();
  return s === "delivered" || s === "cancelled" || s === "completed";
}
