import type { LocalCustomerAccount, Order } from "@/lib/niv-store";

export type CustomerDatabaseEntry = {
  accountId: string;
  status: LocalCustomerAccount["status"];
  approvalRequestedAt?: string;
  approvedAt?: string;
  customer: LocalCustomerAccount["customer"];
  orderCount: number;
  totalOrdered: number;
  lastOrder: Order | null;
  purchaseHistory: Order[];
};

export type CustomerExportRow = {
  accountId: string;
  name: string;
  mobile: string;
  address: string;
  status: string;
  approvalRequestedAt: string;
  approvedAt: string;
  orderCount: number;
  totalOrdered: number;
  lastOrderAt: string;
  purchaseHistory: string;
};

function orderTimestamp(order: Order) {
  const timestamp = Date.parse(order.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function normalizeOrderTimestamp(value: string, fallbackTimestamp = new Date().toISOString()) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallbackTimestamp;
}

export function buildCustomerDatabase(accounts: LocalCustomerAccount[]): CustomerDatabaseEntry[] {
  return accounts.map((account) => {
    const purchaseHistory = [...account.orders].sort((first, second) => orderTimestamp(second) - orderTimestamp(first));
    return {
      accountId: account.id,
      status: account.status ?? "approved",
      approvalRequestedAt: account.approvalRequestedAt,
      approvedAt: account.approvedAt,
      customer: account.customer,
      orderCount: purchaseHistory.length,
      totalOrdered: purchaseHistory.reduce((sum, order) => sum + order.total, 0),
      lastOrder: purchaseHistory[0] ?? null,
      purchaseHistory,
    };
  }).sort((first, second) => orderTimestamp(second.lastOrder ?? { createdAt: "" } as Order) - orderTimestamp(first.lastOrder ?? { createdAt: "" } as Order));
}

export function filterCustomerDatabaseByStatus(entries: CustomerDatabaseEntry[], status: LocalCustomerAccount["status"]) {
  return entries.filter((entry) => (entry.status ?? "approved") === status);
}

export function searchCustomerDatabase(entries: CustomerDatabaseEntry[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
  if (!normalizedQuery) return entries;
  return entries.filter((entry) => [entry.customer.name, entry.customer.phone, entry.customer.address]
    .some((value) => value.toLocaleLowerCase("en-IN").includes(normalizedQuery)));
}

function exportDate(value?: string) {
  return value ? orderDateLabel(value) : "";
}

export function customerDatabaseToRows(entries: CustomerDatabaseEntry[]): CustomerExportRow[] {
  return entries.map((entry) => ({
    accountId: entry.accountId,
    name: entry.customer.name,
    mobile: entry.customer.phone,
    address: entry.customer.address,
    status: entry.status ?? "approved",
    approvalRequestedAt: exportDate(entry.approvalRequestedAt),
    approvedAt: exportDate(entry.approvedAt),
    orderCount: entry.orderCount,
    totalOrdered: entry.totalOrdered,
    lastOrderAt: exportDate(entry.lastOrder?.createdAt),
    purchaseHistory: entry.purchaseHistory.map((order) => `${order.id} (${exportDate(order.createdAt)}): ₹${order.total}`).join(" | "),
  }));
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function customerDatabaseToCsv(entries: CustomerDatabaseEntry[]) {
  const headers: Array<keyof CustomerExportRow> = ["accountId", "name", "mobile", "address", "status", "approvalRequestedAt", "approvedAt", "orderCount", "totalOrdered", "lastOrderAt", "purchaseHistory"];
  const labels = ["Account ID", "Name", "Mobile", "Address", "Status", "Approval Requested", "Approved At", "Order Count", "Total Ordered (INR)", "Last Order", "Purchase History"];
  const rows = customerDatabaseToRows(entries);
  return [labels.map(csvCell).join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
}

export function orderDateLabel(value?: string | null) {
  if (!value) return "Date unavailable";
  try {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return "Date unavailable";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    try {
      return new Date(value).toLocaleDateString("en-IN");
    } catch {
      return "Date unavailable";
    }
  }
}

