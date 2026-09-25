import { describe, expect, it } from "vitest";

import { customerDeliveryStatus, ownerManagedDeliveryNote } from "../shared/store-visibility";

describe("customer delivery visibility", () => {
  it("keeps ordering available at every time by default", () => {
    expect(customerDeliveryStatus()).toBe("Orders accepted anytime");
    expect(customerDeliveryStatus(true)).toBe("Orders accepted anytime");
  });

  it("reflects store closed message when owner marks store as closed", () => {
    expect(customerDeliveryStatus(false)).toBe("Store Currently Closed · Orders queued for next opening");
  });

  it("makes it clear delivery information is owner-managed", () => {
    expect(ownerManagedDeliveryNote).toContain("Owner Dashboard");
  });
});
