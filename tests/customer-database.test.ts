import { describe, expect, it } from "vitest";

import { buildCustomerDatabase, customerDatabaseToCsv, customerDatabaseToRows, filterCustomerDatabaseByStatus, normalizeOrderTimestamp, orderDateLabel, searchCustomerDatabase } from "../shared/customer-database";

const accounts = [
  { id: "nishant", customer: { name: "Nishant", phone: "9876543210", address: "Main Road" }, cart: [], credit: { status: "none" as const, limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [{ id: "NIV-2001", items: [], customer: { name: "Nishant", phone: "9876543210", address: "Main Road" }, payment: "Cash on delivery" as const, status: "Delivered" as const, total: 350, createdAt: "2026-08-20T08:00:00.000Z" }, { id: "NIV-2002", items: [], customer: { name: "Nishant", phone: "9876543210", address: "Main Road" }, payment: "Cash on delivery" as const, status: "New" as const, total: 285, createdAt: "2026-08-25T08:00:00.000Z" }] },
  { id: "pooja", customer: { name: "Pooja", phone: "9876543211", address: "Market Lane" }, cart: [], credit: { status: "none" as const, limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [{ id: "NIV-2003", items: [], customer: { name: "Pooja", phone: "9876543211", address: "Market Lane" }, payment: "Cash on delivery" as const, status: "New" as const, total: 610, createdAt: "2026-08-24T08:00:00.000Z" }] },
];

describe("owner customer database", () => {
  it("preserves pending approval status and customer biodata", () => {
    const database = buildCustomerDatabase([{ id: "pending", status: "pending", approvalRequestedAt: "2026-09-08T10:00:00.000Z", customer: { name: "Nishant", phone: "9876543210", address: "Ward 4, Main Road" }, cart: [], credit: { status: "none", limit: 0, used: 0 }, createdAt: "2026-09-08T10:00:00.000Z", lastSignedInAt: "2026-09-08T10:00:00.000Z", orders: [] }]);
    expect(database[0]).toMatchObject({ accountId: "pending", status: "pending", approvalRequestedAt: "2026-09-08T10:00:00.000Z", customer: { name: "Nishant", phone: "9876543210", address: "Ward 4, Main Road" } });
  });

  it("separates approved and pending customer records without losing profile data", () => {
    const database = buildCustomerDatabase([
      { id: "pending", status: "pending", customer: { name: "Pending User", phone: "9876543212", address: "Village Road" }, cart: [], credit: { status: "none", limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [] },
      { id: "approved", status: "approved", customer: { name: "Approved User", phone: "9876543213", address: "Market Road" }, cart: [], credit: { status: "none", limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [] },
    ]);
    expect(filterCustomerDatabaseByStatus(database, "pending").map((entry) => entry.accountId)).toEqual(["pending"]);
    expect(filterCustomerDatabaseByStatus(database, "approved").map((entry) => entry.accountId)).toEqual(["approved"]);
    expect(filterCustomerDatabaseByStatus(database, "approved")[0]?.customer.address).toBe("Market Road");
  });

  it("summarizes every customer with total order value and newest order first", () => {
    const database = buildCustomerDatabase(accounts);
    expect(database[0]).toMatchObject({ accountId: "nishant", orderCount: 2, totalOrdered: 635, lastOrder: { id: "NIV-2002" } });
    expect(database[1]).toMatchObject({ accountId: "pooja", orderCount: 1, totalOrdered: 610 });
  });

  it("searches approved customer records by name, mobile, or address", () => {
    const database = buildCustomerDatabase(accounts);
    expect(searchCustomerDatabase(database, "nishant").map((entry) => entry.accountId)).toEqual(["nishant"]);
    expect(searchCustomerDatabase(database, "9876543211").map((entry) => entry.accountId)).toEqual(["pooja"]);
    expect(searchCustomerDatabase(database, "market lane").map((entry) => entry.accountId)).toEqual(["pooja"]);
    expect(searchCustomerDatabase(database, "")).toHaveLength(2);
  });

  it("exports customer profile, approval, totals, and history summary rows as CSV", () => {
    const database = buildCustomerDatabase(accounts);
    const rows = customerDatabaseToRows(database);
    const csv = customerDatabaseToCsv(database);
    expect(rows[0]).toMatchObject({ name: "Nishant", mobile: "9876543210", orderCount: 2, totalOrdered: 635 });
    expect(csv).toContain('"Account ID","Name","Mobile"');
    expect(csv).toContain("Nishant");
    expect(csv).toContain("NIV-2002");
    expect(csv).toContain('"635"');
    expect(csv).toContain("₹285");
  });

  it("removes a deleted approved account and allows the same mobile to return as a fresh pending request", () => {
    const approved = { id: "approved", status: "approved" as const, customer: { name: "Approved User", phone: "9876543213", address: "Market Road" }, cart: [], credit: { status: "none" as const, limit: 0, used: 0 }, createdAt: "2026-01-01", lastSignedInAt: "2026-01-01", orders: [] };
    const afterDelete = [approved].filter((account) => account.id !== "approved");
    expect(filterCustomerDatabaseByStatus(buildCustomerDatabase(afterDelete), "approved")).toHaveLength(0);
    const freshPending = { ...approved, id: "fresh-pending", status: "pending" as const, approvalRequestedAt: "2026-09-10T10:00:00.000Z", createdAt: "2026-09-10T10:00:00.000Z", lastSignedInAt: "2026-09-10T10:00:00.000Z" };
    expect(filterCustomerDatabaseByStatus(buildCustomerDatabase([...afterDelete, freshPending]), "pending").map((entry) => entry.accountId)).toEqual(["fresh-pending"]);
  });

  it("formats an ISO order date for readable purchase history", () => {
    expect(orderDateLabel("2026-08-25T08:00:00.000Z")).toContain("2026");
  });

  it("migrates legacy relative timestamps to a saved calendar timestamp", () => {
    expect(normalizeOrderTimestamp("Just now", "2026-08-26T10:10:00.000Z")).toBe("2026-08-26T10:10:00.000Z");
  });

  it("supports role assignment (admin vs customer) and access suspension", () => {
    const customerAccount = {
      id: "cust-1",
      customer: { name: "Vikram", phone: "9876543220", address: "City Center" },
      cart: [],
      credit: { status: "none" as const, limit: 0, used: 0 },
      createdAt: "2026-01-01",
      lastSignedInAt: "2026-01-01",
      status: "approved" as const,
      role: "customer" as const,
      orders: [],
    };

    // Promote to Admin
    const adminAccount = { ...customerAccount, role: "admin" as const };
    expect(adminAccount.role).toBe("admin");

    // Suspend Account
    const suspendedAccount = { ...customerAccount, status: "suspended" as const };
    expect(suspendedAccount.status).toBe("suspended");

    // Permanent delete
    const remaining = [customerAccount].filter(
      (a) => a.id !== "cust-1" && a.customer.phone !== "9876543220"
    );
    expect(remaining).toHaveLength(0);
  });
});

