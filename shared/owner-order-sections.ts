import type { Order } from "@/lib/niv-store";

function dateKey(value: Date) {
  return [value.getFullYear(), value.getMonth(), value.getDate()].join("-");
}

export function splitOrdersByDay<T extends Order>(orders: T[], now = new Date()) {
  const today = dateKey(now);
  const current: T[] = [];
  const previous: T[] = [];

  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime()) || dateKey(createdAt) === today) current.push(order);
    else previous.push(order);
  });

  return { current, previous };
}

export function groupOrdersByDate<T extends Order>(orders: T[]) {
  const groups = new Map<string, { label: string; timestamp: number; orders: T[] }>();
  orders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    const timestamp = createdAt.getTime();
    const key = Number.isNaN(timestamp) ? "legacy" : dateKey(createdAt);
    const label = Number.isNaN(timestamp) ? "Earlier orders" : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(createdAt);
    const group = groups.get(key) ?? { label, timestamp: Number.isNaN(timestamp) ? 0 : timestamp, orders: [] };
    group.orders.push(order);
    groups.set(key, group);
  });
  return [...groups.values()].sort((first, second) => second.timestamp - first.timestamp);
}
