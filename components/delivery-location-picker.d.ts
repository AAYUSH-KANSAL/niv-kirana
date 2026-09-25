import type { ComponentType } from "react";

import type { GeoCoordinate } from "@/shared/delivery-location";

export const DeliveryLocationPicker: ComponentType<{
  title: string;
  description: string;
  address?: string;
  onAddressChange?: (address: string) => void;
  coordinate?: GeoCoordinate;
  onCoordinateChange: (coordinate: GeoCoordinate) => void;
  storeCoordinate?: GeoCoordinate;
  deliveryRadius?: string;
  requireCurrentLocation?: boolean;
  onGpsLocationChange?: (coordinate: GeoCoordinate) => void;
}>;
