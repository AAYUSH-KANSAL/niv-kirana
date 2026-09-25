import { describe, expect, it } from "vitest";

import type { LocalCustomerAccount } from "../lib/niv-store";
import type { VoiceOrder } from "../lib/voice-orders";
import { mergeLegacyVoiceOrders, voiceOrderToNormalOrder } from "../shared/voice-order-routing";
import { updateAccountOrderTotal } from "../shared/owner-order-routing";
import { splitOrdersByDay } from "../shared/owner-order-sections";
import { splitCustomerOrders } from "../shared/customer-orders";

const customer = { name: "Rohan", phone: "7060902859", address: "NIV Nagar" };
const baseAccount: LocalCustomerAccount = { id: "customer-1", customer, cart: [], orders: [], credit: { status: "none", limit: 0, used: 0, enabled: false }, createdAt: "2026-08-26T08:00:00.000Z", lastSignedInAt: "2026-08-26T08:00:00.000Z" };

function voiceOrder(overrides: Partial<VoiceOrder> = {}): VoiceOrder {
  return { id: "NIV-VOICE-1", customer, audioUri: "file:///voice.m4a", createdAt: "2026-08-27T10:00:00.000Z", status: "Received", ...overrides };
}

describe("voice order integration", () => {
  it("converts a recording into a normal pending Order with audio attached", () => {
    const order = voiceOrderToNormalOrder(voiceOrder());
    expect(order.id).toBe("NIV-VOICE-1");
    expect(order.status).toBe("New");
    expect(order.items).toEqual([]);
    expect(order.audioUri).toBe("file:///voice.m4a");
  });

  it("keeps a confirmed legacy recording packed for the confirmed owner list", () => {
    const order = voiceOrderToNormalOrder(voiceOrder({ status: "Confirmed" }));
    expect(order.status).toBe("Packed");
    expect(order.confirmedAt).toBe(order.createdAt);
  });

  it("routes a migrated recording to the matching customer account only once", () => {
    const migrated = mergeLegacyVoiceOrders([baseAccount], [voiceOrder(), voiceOrder()]);
    expect(migrated).toHaveLength(1);
    expect(migrated[0].orders).toHaveLength(1);
    expect(migrated[0].orders[0].audioUri).toBe("file:///voice.m4a");
  });

  it("shows a voice order in the normal customer order section and moves it after delivery", () => {
    const normalOrder = voiceOrderToNormalOrder(voiceOrder());
    const current = splitOrdersByDay([{ ...normalOrder, accountId: baseAccount.id }], new Date("2026-08-27T18:00:00.000Z"));
    expect(current.current.map((item) => item.id)).toEqual(["NIV-VOICE-1"]);
    expect(normalOrder.audioUri).toBe("file:///voice.m4a");

    const delivered = { ...normalOrder, status: "Delivered" as const };
    const deliveredSplit = splitCustomerOrders([delivered]);
    expect(deliveredSplit.current).toHaveLength(0);
    expect(deliveredSplit.previous.map((item) => item.id)).toEqual(["NIV-VOICE-1"]);
  });

  it("allows store owner to enter and update bill amount for a voice order", () => {
    const normalOrder = voiceOrderToNormalOrder(voiceOrder());
    expect(normalOrder.total).toBe(0);
    expect(normalOrder.audioUri).toBe("file:///voice.m4a");

    const accountWithVoiceOrder: LocalCustomerAccount = {
      ...baseAccount,
      orders: [normalOrder],
    };

    // Store owner sets bill amount to ₹480
    const updatedAccounts = updateAccountOrderTotal([accountWithVoiceOrder], baseAccount.id, normalOrder.id, 480);
    const updatedOrder = updatedAccounts[0].orders.find((o) => o.id === normalOrder.id);

    expect(updatedOrder).toBeDefined();
    expect(updatedOrder?.total).toBe(480);
    expect(updatedOrder?.audioUri).toBe("file:///voice.m4a");
    expect(updatedOrder?.customer.name).toBe("Rohan");
  });
});

