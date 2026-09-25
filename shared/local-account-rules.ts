import { deliveryRadiusKm, distanceBetweenKm, isWithinDeliveryRadius, type GeoCoordinate } from "./delivery-location";

export const LOCAL_ACCOUNT_RADIUS_KM = 10;

export function normalizeIndianMobile(value: string) {
  return value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10);
}

export function canCreateLocalAccount(name: string, phone: string, address: string) {
  return name.trim().length >= 2 && normalizeIndianMobile(phone).length === 10 && address.trim().length >= 4;
}

export type LocalAccountEligibilityInput = {
  name: string;
  phone: string;
  address: string;
  location?: GeoCoordinate;
  gpsVerified: boolean;
  storeLocation?: GeoCoordinate;
  configuredRadius?: string;
};

export type LocalAccountEligibilityResult =
  | { valid: true; distanceKm: number }
  | { valid: false; reason: "required-fields" | "location-required" | "store-location-unavailable" | "outside-radius"; distanceKm?: number };

export function validateLocalAccountEligibility(input: LocalAccountEligibilityInput): LocalAccountEligibilityResult {
  if (!canCreateLocalAccount(input.name, input.phone, input.address)) return { valid: false, reason: "required-fields" };
  if (!input.gpsVerified || !input.location) return { valid: false, reason: "location-required" };
  if (!input.storeLocation) return { valid: false, reason: "store-location-unavailable" };

  const radiusKm = Math.min(LOCAL_ACCOUNT_RADIUS_KM, deliveryRadiusKm(input.configuredRadius ?? `${LOCAL_ACCOUNT_RADIUS_KM} km`) || LOCAL_ACCOUNT_RADIUS_KM);
  const distanceKm = Math.round(distanceBetweenKm(input.location, input.storeLocation) * 100) / 100;
  return isWithinDeliveryRadius(input.location, input.storeLocation, radiusKm)
    ? { valid: true, distanceKm }
    : { valid: false, reason: "outside-radius", distanceKm };
}

