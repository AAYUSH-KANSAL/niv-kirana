import { describe, expect, it } from "vitest";

import { canCreateLocalAccount, normalizeIndianMobile, validateLocalAccountEligibility } from "../shared/local-account-rules";
import type { GeoCoordinate } from "../shared/delivery-location";

describe("local account rules", () => {
  it("normalizes Indian mobile formats", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("9876543210");
  });

  it("requires a complete local account profile", () => {
    expect(canCreateLocalAccount("Rohan", "9876543210", "Ward 4, Main Road")).toBe(true);
    expect(canCreateLocalAccount("R", "9876543210", "Ward 4")).toBe(false);
  });

  it("requires GPS verification and a configured shop centre", () => {
    const result = validateLocalAccountEligibility({ name: "Rohan", phone: "9876543210", address: "Ward 4, Main Road", location: { latitude: 28.73, longitude: 77.78 }, gpsVerified: false });
    expect(result).toEqual({ valid: false, reason: "location-required" });

    const withoutCentre = validateLocalAccountEligibility({ name: "Rohan", phone: "9876543210", address: "Ward 4, Main Road", location: { latitude: 28.73, longitude: 77.78 }, gpsVerified: true });
    expect(withoutCentre).toEqual({ valid: false, reason: "store-location-unavailable" });
  });

  it("accepts a verified customer inside 10 km and rejects one outside it", () => {
    const centre: GeoCoordinate = { latitude: 28.73, longitude: 77.78 };
    const inside = validateLocalAccountEligibility({ name: "Rohan", phone: "9876543210", address: "Ward 4, Main Road", location: { latitude: 28.73, longitude: 77.79 }, gpsVerified: true, storeLocation: centre, configuredRadius: "25 km" });
    expect(inside.valid).toBe(true);

    const outside = validateLocalAccountEligibility({ name: "Rohan", phone: "9876543210", address: "Ward 4, Main Road", location: { latitude: 28.73, longitude: 77.91 }, gpsVerified: true, storeLocation: centre, configuredRadius: "25 km" });
    expect(outside).toMatchObject({ valid: false, reason: "outside-radius" });
  });
});
