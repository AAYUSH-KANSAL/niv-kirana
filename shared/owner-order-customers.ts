import type { OwnerOrder } from "./owner-order-routing";

export type OrderCustomerSummary = {
  accountId: string;
  name: string;
  phone: string;
  address: string;
  orders: OwnerOrder[];
  latestCreatedAt: string;
  voiceOrderCount: number;
};

export function summarizeOwnerOrders(orders: OwnerOrder[]): OrderCustomerSummary[] {
  const summaries = new Map<string, OrderCustomerSummary>();

  for (const order of orders) {
    const current = summaries.get(order.accountId);
    if (current) {
      current.orders.push(order);
      if (new Date(order.createdAt).getTime() > new Date(current.latestCreatedAt).getTime()) {
        current.latestCreatedAt = order.createdAt;
        current.name = order.customer.name;
        current.phone = order.customer.phone;
        current.address = order.customer.address;
      }
      continue;
    }

    summaries.set(order.accountId, {
      accountId: order.accountId,
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      orders: [order],
      latestCreatedAt: order.createdAt,
      voiceOrderCount: 0,
    });
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      orders: [...summary.orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      voiceOrderCount: summary.orders.filter((order) => Boolean(order.audioUri)).length,
    }))
    .sort((a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime());
}
