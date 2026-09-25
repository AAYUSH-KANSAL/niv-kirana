import { describe, expect, it } from "vitest";

import { deliveryRadiusKm, distanceBetweenKm, isWithinDeliveryRadius } from "../shared/delivery-location";

describe("delivery location rules", () => {
  it("reads a configured kilometre radius", () => {
    expect(deliveryRadiusKm("10 km")).toBe(10);
  });

  it("calculates the straight-line delivery distance and validates the radius", () => {
    const store = { latitude: 28.6139, longitude: 77.209 };
    const nearbyCustomer = { latitude: 28.635, longitude: 77.218 };
    expect(distanceBetweenKm(store, nearbyCustomer)).toBeLessThan(3);
    expect(isWithinDeliveryRadius(nearbyCustomer, store, 10)).toBe(true);
    expect(isWithinDeliveryRadius(nearbyCustomer, store, 1)).toBe(false);
  });
});
