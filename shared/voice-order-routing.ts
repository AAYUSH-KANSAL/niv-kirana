import type { LocalCustomerAccount, Order, OrderStatus } from "@/lib/niv-store";
import type { VoiceOrder } from "@/lib/voice-orders";
import { normalizeIndianMobile } from "./local-account-rules";

export type OwnerOrder = Order & { accountId: string };

export function isOrderConfirmed(order: Order) {
  return Boolean(order.confirmedAt) || ["Packed", "Out for delivery", "Delivered"].includes(order.status);
}

export function collectOwnerOrders(accounts: LocalCustomerAccount[]): OwnerOrder[] {
  return accounts.flatMap((account) => account.orders.map((order) => ({ ...order, accountId: account.id })));
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
    const target = account.orders.find((item) => item.id === orderId);
    if (target?.status === "Delivered") {
      return account;
    }
    deletedOrder = target;
    return deletedOrder ? { ...account, orders: account.orders.filter((item) => item.id !== orderId) } : account;
  });
  return { accounts: nextAccounts, deletedOrder };
}

function voiceStatusToOrderStatus(status: VoiceOrder["status"]): OrderStatus {
  if (status === "Confirmed") return "Packed";
  return "New";
}

export function voiceOrderToNormalOrder(voiceOrder: VoiceOrder): Order {
  const status = voiceStatusToOrderStatus(voiceOrder.status);
  return {
    id: voiceOrder.id,
    items: [],
    customer: voiceOrder.customer,
    payment: "Cash on delivery",
    fulfillment: "Delivery",
    status,
    total: 0,
    createdAt: voiceOrder.createdAt,
    confirmedAt: status === "Packed" ? voiceOrder.createdAt : undefined,
    audioUri: voiceOrder.audioUri,
    note: "Voice Order — recording सुनकर items और bill confirm करें।",
  };
}

export function mergeLegacyVoiceOrders(accounts: LocalCustomerAccount[], voiceOrders: VoiceOrder[]) {
  let nextAccounts = accounts.map((account) => ({ ...account, orders: [...account.orders] }));
  voiceOrders.forEach((voiceOrder) => {
    if (nextAccounts.some((account) => account.orders.some((order) => order.id === voiceOrder.id))) return;
    const phone = normalizeIndianMobile(voiceOrder.customer.phone);
    let accountIndex = nextAccounts.findIndex((account) => normalizeIndianMobile(account.customer.phone) === phone && Boolean(phone));
    if (accountIndex < 0) {
      nextAccounts = [{
        id: `customer-${phone || voiceOrder.id.toLowerCase()}`,
        customer: voiceOrder.customer,
        cart: [],
        orders: [],
        credit: { status: "none", limit: 0, used: 0, enabled: false },
        createdAt: voiceOrder.createdAt,
        lastSignedInAt: voiceOrder.createdAt,
      }, ...nextAccounts];
      accountIndex = 0;
    }
    const account = nextAccounts[accountIndex];
    nextAccounts[accountIndex] = { ...account, orders: [voiceOrderToNormalOrder(voiceOrder), ...account.orders] };
  });
  return nextAccounts;
}
