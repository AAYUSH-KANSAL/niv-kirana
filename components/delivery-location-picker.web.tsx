import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { formatCoordinate, type GeoCoordinate } from "@/shared/delivery-location";

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

const DEFAULT_FALLBACK_COORDINATE: GeoCoordinate = {
  latitude: 28.4595,
  longitude: 77.0266,
};

export function DeliveryLocationPicker({
  title,
  description,
  address,
  onAddressChange,
  coordinate,
  onCoordinateChange,
  requireCurrentLocation,
  onGpsLocationChange,
}: Props) {
  const [locating, setLocating] = useState(false);
  const [lastFetchedSource, setLastFetchedSource] = useState<string | null>(null);

  const fetchAddressFromCoords = async (coords: GeoCoordinate) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en,hi`,
        {
          headers: {
            "Accept-Language": "en,hi",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.display_name && onAddressChange) {
          onAddressChange(data.display_name);
          setLastFetchedSource("GPS Reverse Geocoded");
          return;
        }
      }
    } catch {
      // ignore network errors and proceed to fallback
    }

    if (onAddressChange && (!address || !address.trim() || address === "अपना delivery address जोड़ें")) {
      const fallbackText = `Current Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
      onAddressChange(fallbackText);
      setLastFetchedSource("GPS Coordinates");
    }
  };

  const useBrowserLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      Alert.alert(
        "Location Unsupported",
        "Aapke browser me location support nahi hai. Kripya address manually type karein."
      );
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (result) => {
        const next: GeoCoordinate = {
          latitude: Number(result.coords.latitude.toFixed(6)),
          longitude: Number(result.coords.longitude.toFixed(6)),
        };

        onCoordinateChange(next);
        onGpsLocationChange?.(next);

        await fetchAddressFromCoords(next);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        let errorMsg = "Device location fetch nahi ho saki.";
        if (error.code === 1) {
          errorMsg =
            "Browser me Location Permission Blocked hai. Kripya browser URL bar me lock icon par click karke Location allow karein, ya neeche 'Use Sample Store Location' click karein.";
        } else if (error.code === 2) {
          errorMsg = "Device GPS position unavailable hai. Kripya check karein ki location service on hai.";
        } else if (error.code === 3) {
          errorMsg = "Location fetch timed out. Kripya dobara try karein.";
        }

        Alert.alert(
          "Location Permission",
          errorMsg,
          [
            { text: "Type Manually", style: "cancel" },
            {
              text: "Use Store Area Pin",
              onPress: async () => {
                onCoordinateChange(DEFAULT_FALLBACK_COORDINATE);
                onGpsLocationChange?.(DEFAULT_FALLBACK_COORDINATE);
                if (onAddressChange) {
                  onAddressChange("Near NIV Kirana Store, Main Market, Kuchesar Road Chopla, Uttar Pradesh");
                  setLastFetchedSource("Store Area Pin");
                }
              },
            },
          ]
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <View className="mt-4 rounded-3xl bg-surface border border-border p-4 shadow-sm">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start flex-1 pr-2">
          <View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center">
            <MaterialIcons name="location-on" size={21} color="#176B45" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-sm font-black text-foreground">{title}</Text>
            <Text className="text-xs leading-5 text-muted mt-0.5">{description}</Text>
          </View>
        </View>

        {coordinate ? (
          <View className="px-2 py-0.5 rounded-full bg-[#EAF4D9]">
            <Text className="text-[10px] font-black text-primary">GPS ACTIVE</Text>
          </View>
        ) : null}
      </View>

      {/* Address Text Area */}
      {onAddressChange ? (
        <View className="mt-3">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-muted">Delivery Address</Text>
            {lastFetchedSource ? (
              <View className="flex-row items-center">
                <MaterialIcons name="check" size={13} color="#176B45" />
                <Text className="text-[10px] font-bold text-primary ml-1">
                  {lastFetchedSource}
                </Text>
              </View>
            ) : null}
          </View>

          <TextInput
            value={address}
            onChangeText={onAddressChange}
            placeholder="House / Flat No, Street, Landmark, Village or City"
            placeholderTextColor="#74847A"
            multiline
            className="rounded-2xl bg-background border border-border px-3.5 py-3 text-xs text-foreground font-medium min-h-[76px]"
          />
        </View>
      ) : null}

      {/* Use Current Location Action Button */}
      <TouchableOpacity
        disabled={locating}
        onPress={useBrowserLocation}
        activeOpacity={0.85}
        className={`flex-row justify-center items-center rounded-2xl py-3 mt-3 shadow-sm ${
          locating ? "bg-[#145C3B] opacity-80" : "bg-primary"
        }`}
      >
        {locating ? (
          <ActivityIndicator size="small" color="#FFF9EF" />
        ) : (
          <MaterialIcons name="my-location" size={18} color="#FFF9EF" />
        )}
        <Text className="ml-2 text-xs font-black text-background">
          {locating
            ? "Fetching live GPS & address..."
            : requireCurrentLocation
            ? "Verify current location"
            : "Use current location (Auto-fill address)"}
        </Text>
      </TouchableOpacity>

      {coordinate ? (
        <View className="rounded-xl bg-[#EFF7E2] px-3 py-2 mt-2.5 flex-row items-center justify-between">
          <Text className="text-[10px] font-black text-primary">
            PIN SAVED · {formatCoordinate(coordinate)}
          </Text>
          <MaterialIcons name="check-circle" size={14} color="#176B45" />
        </View>
      ) : null}

      <Text className="text-[10px] leading-4 text-muted mt-2">
        {requireCurrentLocation
          ? "Account creation ke liye current browser location zaroori hai."
          : "Button click karne par aapka exact address aur pin auto-detect ho kar upar text area me fill ho jayega."}
      </Text>
    </View>
  );
}
