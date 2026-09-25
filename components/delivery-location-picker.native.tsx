import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { deliveryRadiusKm, distanceBetweenKm, formatCoordinate, type GeoCoordinate } from "@/shared/delivery-location";

const INDIA_CENTER: GeoCoordinate = { latitude: 22.5937, longitude: 78.9629 };

type Props = {
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
};

function readableAddress(result: Location.LocationGeocodedAddress | undefined) {
  if (!result) return "";
  return result.formattedAddress || [result.name, result.street, result.district, result.city, result.region, result.postalCode].filter(Boolean).join(", ");
}

export function DeliveryLocationPicker({ title, description, address, onAddressChange, coordinate, onCoordinateChange, storeCoordinate, deliveryRadius, requireCurrentLocation, onGpsLocationChange }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapCoordinate, setMapCoordinate] = useState<GeoCoordinate>(coordinate ?? storeCoordinate ?? INDIA_CENTER);
  const radiusKm = deliveryRadius ? deliveryRadiusKm(deliveryRadius) : 0;
  const distanceKm = coordinate && storeCoordinate ? distanceBetweenKm(coordinate, storeCoordinate) : null;

  useEffect(() => {
    if (mapOpen) setMapCoordinate(coordinate ?? storeCoordinate ?? INDIA_CENTER);
  }, [coordinate, mapOpen, storeCoordinate]);

  const handleUseGps = async () => {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) { Alert.alert("Location unavailable", "पहले device location services on करें। "); return; }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("Location permission", "GPS address भरने के लिए location permission दें, या address manually भरें। "); return; }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const next = { latitude: current.coords.latitude, longitude: current.coords.longitude };
    onCoordinateChange(next);
    onGpsLocationChange?.(next);
    setMapCoordinate(next);
    if (onAddressChange) {
      try {
        const result = await Location.reverseGeocodeAsync(next);
        const nextAddress = readableAddress(result[0]);
        if (nextAddress) {
          onAddressChange(nextAddress);
        } else {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${next.latitude}&lon=${next.longitude}&format=json&accept-language=en,hi`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.display_name) onAddressChange(data.display_name);
          }
        }
      } catch {
        if (!address || !address.trim() || address === "अपना delivery address जोड़ें") {
          onAddressChange(`Current Location (${next.latitude.toFixed(4)}, ${next.longitude.toFixed(4)})`);
        }
      }
    }
  };

  const confirmMapPin = async () => {
    onCoordinateChange(mapCoordinate);
    if (onAddressChange) {
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.status === "granted") {
        try {
          const result = await Location.reverseGeocodeAsync(mapCoordinate);
          const nextAddress = readableAddress(result[0]);
          if (nextAddress) onAddressChange(nextAddress);
        } catch {
          if (!address || !address.trim() || address === "अपना delivery address जोड़ें") {
            onAddressChange(`Pinned Location (${mapCoordinate.latitude.toFixed(4)}, ${mapCoordinate.longitude.toFixed(4)})`);
          }
        }
      }
    }
    setMapOpen(false);
  };

  return <View className="mt-4 rounded-3xl bg-surface border border-border p-4"><View className="flex-row items-start"><View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] items-center justify-center"><MaterialIcons name="location-on" size={21} color="#176B45" /></View><View className="flex-1 ml-3"><Text className="text-sm font-extrabold text-foreground">{title}</Text><Text className="text-xs leading-5 text-muted mt-1">{description}</Text></View></View>{onAddressChange ? <TextInput value={address} onChangeText={onAddressChange} placeholder="House, street, village, landmark" placeholderTextColor="#74847A" multiline className="mt-4 rounded-2xl bg-background border border-border px-4 py-3 text-sm text-foreground min-h-20" /> : null}<View className="flex-row mt-3"><TouchableOpacity onPress={() => void handleUseGps()} className="flex-1 flex-row justify-center items-center rounded-2xl bg-primary py-3"><MaterialIcons name="my-location" size={18} color="#FFF9EF" /><Text className="ml-2 text-xs font-extrabold text-background">{requireCurrentLocation ? "Verify current location" : "Use GPS"}</Text></TouchableOpacity>{requireCurrentLocation ? null : <TouchableOpacity onPress={() => setMapOpen(true)} className="flex-1 flex-row justify-center items-center rounded-2xl bg-background border border-primary py-3 ml-2"><MaterialIcons name="map" size={18} color="#176B45" /><Text className="ml-2 text-xs font-extrabold text-primary">Choose on map</Text></TouchableOpacity>}</View>{coordinate ? <View className="rounded-2xl bg-[#EFF7E2] px-3 py-2 mt-3"><Text className="text-[11px] font-bold text-primary">PIN SAVED · {formatCoordinate(coordinate)}</Text>{distanceKm !== null && radiusKm > 0 ? <Text className={`text-xs font-bold mt-1 ${distanceKm <= radiusKm ? "text-success" : "text-error"}`}>{distanceKm.toFixed(1)} km from shop · {distanceKm <= radiusKm ? `within ${radiusKm} km delivery area` : `outside ${radiusKm} km delivery area`}</Text> : null}</View> : null}<Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}><View className="flex-1 bg-background"><View className="flex-row justify-between items-center px-5 pt-16 pb-4"><View><Text className="text-xl font-extrabold text-foreground">Choose delivery pin</Text><Text className="text-xs text-muted mt-1">Pin drag करें या map पर tap करें।</Text></View><TouchableOpacity onPress={() => setMapOpen(false)} className="h-10 w-10 rounded-xl bg-surface items-center justify-center"><MaterialIcons name="close" size={22} color="#176B45" /></TouchableOpacity></View><MapView style={{ flex: 1 }} initialRegion={{ latitude: mapCoordinate.latitude, longitude: mapCoordinate.longitude, latitudeDelta: 0.12, longitudeDelta: 0.12 }} onPress={(event) => setMapCoordinate(event.nativeEvent.coordinate)}>{storeCoordinate && radiusKm > 0 ? <Circle center={storeCoordinate} radius={radiusKm * 1000} fillColor="rgba(23,107,69,0.12)" strokeColor="#176B45" /> : null}{storeCoordinate ? <Marker coordinate={storeCoordinate} title="NIV Kirana" pinColor="#176B45" /> : null}<Marker coordinate={mapCoordinate} draggable onDragEnd={(event) => setMapCoordinate(event.nativeEvent.coordinate)} title="Your delivery pin" /></MapView><View className="px-5 pt-4 pb-8 border-t border-border"><Text className="text-xs text-muted">Selected pin: {formatCoordinate(mapCoordinate)}</Text><TouchableOpacity onPress={() => void confirmMapPin()} className="rounded-2xl bg-primary py-4 items-center mt-3"><Text className="text-sm font-extrabold text-background">Confirm this location</Text></TouchableOpacity></View></View></Modal></View>;
}
