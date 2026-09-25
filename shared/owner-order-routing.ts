import type { LocalCustomerAccount, Order, OrderStatus } from "@/lib/niv-store";

export type OwnerOrder = Order & { accountId: string };

export function isOrderConfirmed(order: Order) {
  return Boolean(order.confirmedAt) || ["Packed", "Out for delivery", "Delivered"].includes(order.status);
}

export function collectOwnerOrders(accounts: LocalCustomerAccount[], historicalOrders?: Order[]): OwnerOrder[] {
  const fromAccounts = accounts.flatMap((account) => account.orders.map((order) => ({ ...order, accountId: account.id })));
  if (!historicalOrders || historicalOrders.length === 0) {
    return fromAccounts;
  }
  const existingIds = new Set(fromAccounts.map((o) => o.id));
  const fromHistorical: OwnerOrder[] = historicalOrders
    .filter((order) => !existingIds.has(order.id))
    .map((order) => ({ ...order, accountId: order.customerId || "archived-customer" }));

  return [...fromAccounts, ...fromHistorical];
}

export function updateAccountOrderStatus(accounts: LocalCustomerAccount[], accountId: string, orderId: string, status: OrderStatus) {
  return accounts.map((account) => account.id === accountId
    ? { ...account, orders: account.orders.map((order) => order.id === orderId ? { ...order, status } : order) }
    : account,
  );
}

export function confirmAccountOrder(accounts: LocalCustomerAccount[], accountId: string, orderId: string, confirmedAt = new Date().toISOString()) {
  return accounts.map((account) => account.id === accountId
    ? { ...account, orders: account.orders.map((order) => order.id === orderId ? { ...order, status: "Packed" as const, confirmedAt: order.confirmedAt ?? confirmedAt } : order) }
    : account,
  );
}

export function removeAccountOrder(accounts: LocalCustomerAccount[], accountId: string, orderId: string) {
  let deletedOrder: Order | undefined;
  const nextAccounts = accounts.map((account) => {
    if (account.id !== accountId) return account;
    const target = account.orders.find((order) => order.id === orderId);
    if (target?.status === "Delivered" || target?.status === "Cancelled") {
      // Delivered and Cancelled orders cannot be deleted as they form permanent sales records
      return account;
    }
    deletedOrder = target;
    return deletedOrder ? { ...account, orders: account.orders.filter((order) => order.id !== orderId) } : account;
  });
  return { accounts: nextAccounts, deletedOrder };
}

export function updateAccountOrderTotal(accounts: LocalCustomerAccount[], accountId: string, orderId: string, total: number) {
  return accounts.map((account) => {
    const hasOrder = account.orders.some((order) => order.id === orderId);
    if (account.id !== accountId && !hasOrder) return account;
    return {
      ...account,
      orders: account.orders.map((order) => order.id === orderId ? { ...order, total } : order),
    };
  });
}
