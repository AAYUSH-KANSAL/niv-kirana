import { describe, expect, it } from "vitest";

import { customerOrderStatusLabel, customerOrderStatusMessage, trackingStepState } from "../shared/order-tracking";

describe("customer order tracking", () => {
  it("uses a complete Pending label and switches to Complete after delivery", () => {
    expect(customerOrderStatusLabel("New")).toBe("Pending");
    expect(customerOrderStatusLabel("Payment pending")).toBe("Pending");
    expect(customerOrderStatusLabel("Delivered")).toBe("Complete");
  });
  it("makes the packed update clear to the customer", () => {
    expect(customerOrderStatusMessage("Packed")).toBe("Aapka saman pack ho gaya hai.");
    expect(trackingStepState("Packed", "New")).toBe("complete");
    expect(trackingStepState("Packed", "Packed")).toBe("current");
    expect(trackingStepState("Packed", "Out for delivery")).toBe("upcoming");
  });

  it("keeps delivery steps pending while UPI verification is pending", () => {
    expect(customerOrderStatusMessage("Payment pending")).toContain("verification pending");
    expect(trackingStepState("Payment pending", "New")).toBe("upcoming");
  });

  it("handles cancelled orders clearly with cancellation message and label", () => {
    expect(customerOrderStatusLabel("Cancelled")).toBe("Cancelled");
    expect(customerOrderStatusMessage("Cancelled")).toBe("Aapka yeh order cancel ho chuka hai.");
    expect(trackingStepState("Cancelled", "New")).toBe("upcoming");
    expect(trackingStepState("Cancelled", "Packed")).toBe("upcoming");
  });
});
