export type GeoCoordinate = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function deliveryRadiusKm(value: string) {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function distanceBetweenKm(from: GeoCoordinate, to: GeoCoordinate) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitudeOne = toRadians(from.latitude);
  const latitudeTwo = toRadians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function isWithinDeliveryRadius(customer: GeoCoordinate, store: GeoCoordinate, radiusKm: number) {
  return distanceBetweenKm(customer, store) <= radiusKm;
}

export function formatCoordinate(coordinate: GeoCoordinate) {
  return `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`;
}
