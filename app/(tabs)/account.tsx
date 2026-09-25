import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useNivStore } from "@/lib/niv-store";
import { formatCoordinate, type GeoCoordinate } from "@/shared/delivery-location";
import {
  customerDeliveryStatus,
  ownerManagedDeliveryNote,
} from "@/shared/store-visibility";

export default function AccountScreen() {
  const router = useRouter();
  const { customer, updateCustomer, settings, signOut, accounts } = useNivStore();

  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [location, setLocation] = useState<GeoCoordinate | undefined>(customer.location);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setLocation(customer.location);
  }, [customer]);

  const detectCurrentLocation = async () => {
    setLocating(true);

    if (Platform.OS === "web") {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setLocating(false);
        Alert.alert(
          "Location Unsupported",
          "Aapke browser me location support nahi hai. Kripya address manually likhein."
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const nextCoord: GeoCoordinate = {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          };
          setLocation(nextCoord);

          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${nextCoord.latitude}&lon=${nextCoord.longitude}&format=json&accept-language=en,hi`
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data.display_name) {
                setAddress(data.display_name);
              } else {
                setAddress(`Current Location (${nextCoord.latitude.toFixed(4)}, ${nextCoord.longitude.toFixed(4)})`);
              }
            } else {
              setAddress(`Current Location (${nextCoord.latitude.toFixed(4)}, ${nextCoord.longitude.toFixed(4)})`);
            }
          } catch {
            setAddress(`Current Location (${nextCoord.latitude.toFixed(4)}, ${nextCoord.longitude.toFixed(4)})`);
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          setLocating(false);
          let errorMsg = "Device location fetch nahi ho saki.";
          if (error.code === 1) {
            errorMsg = "Browser me Location access blocked hai. Kripya URL bar me lock icon par click karke Location allow karein.";
          }
          Alert.alert(
            "Location Permission",
            errorMsg,
            [
              { text: "Type Manually", style: "cancel" },
              {
                text: "Use Store Area Address",
                onPress: () => {
                  setAddress("Near NIV Kirana Store, Main Market, Kuchesar Road Chopla, Uttar Pradesh");
                  setLocation({ latitude: 28.7456, longitude: 77.9254 });
                },
              },
            ]
          );
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      try {
        const Location = await import("expo-location");
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          setLocating(false);
          Alert.alert("Location Services Off", "Phone ki location services on karein.");
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setLocating(false);
          Alert.alert("Location Permission", "GPS address detect karne ke liye permission allow karein.");
          return;
        }

        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const nextCoord: GeoCoordinate = {
          latitude: Number(current.coords.latitude.toFixed(6)),
          longitude: Number(current.coords.longitude.toFixed(6)),
        };
        setLocation(nextCoord);

        try {
          const result = await Location.reverseGeocodeAsync(nextCoord);
          const r = result[0];
          const formatted = r ? (r.formattedAddress || [r.name, r.street, r.district, r.city, r.region, r.postalCode].filter(Boolean).join(", ")) : "";
          if (formatted) {
            setAddress(formatted);
          } else {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${nextCoord.latitude}&lon=${nextCoord.longitude}&format=json&accept-language=en,hi`);
            if (resp.ok) {
              const data = await resp.json();
              if (data.display_name) setAddress(data.display_name);
            }
          }
        } catch {
          setAddress(`Current Location (${nextCoord.latitude.toFixed(4)}, ${nextCoord.longitude.toFixed(4)})`);
        }
      } catch {
        Alert.alert("Location Error", "Location fetch nahi ho saki.");
      } finally {
        setLocating(false);
      }
    }
  };

  const save = () => {
    if (name.trim().length < 2 || address.trim().length < 4) {
      Alert.alert(
        "Profile Details Required",
        "Kripya apna poora naam aur delivery address bharein."
      );
      return;
    }

    updateCustomer({
      name: name.trim(),
      phone: customer.phone || phone,
      address: address.trim(),
      location,
    });

    Alert.alert("Profile Updated", "Aapka delivery profile aur location update ho gaya hai.");
  };

  const logout = () => {
    Alert.alert("Sign Out", "Kya aap NIV Kirana se logout karna chahte hain?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          signOut();
          router.replace("/login" as never);
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="px-4" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Top Profile Card Header */}
        <View className="pt-2 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="h-14 w-14 rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center shadow-sm">
              <MaterialIcons name="person" size={28} color="#176B45" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-xl font-black text-foreground tracking-tight">
                {customer.name || "Customer Profile"}
              </Text>
              <Text className="text-xs text-muted mt-0.5">
                {accounts.length} NIV account{accounts.length === 1 ? "" : "s"} on this device
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityLabel="Logout"
            onPress={logout}
            activeOpacity={0.8}
            className="h-10 w-10 rounded-2xl bg-[#FFF1E9] border border-[#FAD6C3] items-center justify-center"
          >
            <MaterialIcons name="logout" size={19} color="#B44C26" />
          </TouchableOpacity>
        </View>

        {/* Visit Shop Lifetime Free Banner */}
        <View className="rounded-[24px] bg-[#EAF4D9] border border-[#CFE6B6] p-3.5 mt-4 flex-row items-center shadow-xs">
          <View className="h-9 w-9 rounded-xl bg-[#176B45] items-center justify-center mr-3">
            <MaterialIcons name="storefront" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-black text-[#176B45]">
              Visit shop for account opening once time and enjoy lifetime free
            </Text>
            <Text className="text-[11px] font-medium text-[#5C6E63] mt-0.5">
              Kuchesar Road Chopla store · One-time verification for lifetime free home delivery & NIV Khata.
            </Text>
          </View>
        </View>

        {/* Delivery Details Form */}
        <View className="rounded-[28px] bg-surface border border-border p-4 mt-4 shadow-sm">
          <View className="flex-row items-center mb-1">
            <MaterialIcons name="location-pin" size={19} color="#176B45" />
            <Text className="ml-1 text-sm font-black text-foreground">
              Delivery Details
            </Text>
          </View>
          <Text className="text-xs text-muted mt-0.5 mb-3">
            Isi address par aapki grocery delivery aayegi.
          </Text>

          <ProfileField label="Full Name" value={name} onChange={setName} />
          {/* Registered Mobile Number with Launching Soon badge */}
          <View className="mt-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-muted">Registered Mobile Number</Text>
              <View className="px-2 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex-row items-center">
                <MaterialIcons name="lock" size={11} color="#C2410C" />
                <Text className="text-[10px] font-black text-[#C2410C] ml-1">
                  Update: Launching Soon
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert(
                  "Mobile Number Update · Launching Soon",
                  `Aapka registered mobile number (+91 ${customer.phone || phone}) verified hai. Security aur fraud prevention ke tahat mobile number change jald shuru kiya jayega (Launching Soon).\n\nEmergency me number badalwane ke liye Store Helpline par sampark karein.`
                );
              }}
              className="rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] px-3.5 py-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <MaterialIcons name="phone" size={16} color="#74847A" />
                <Text className="ml-2 text-xs font-black text-[#374151]">
                  +91 {customer.phone || phone}
                </Text>
              </View>
              <View className="flex-row items-center bg-[#EFF7E2] px-2 py-0.5 rounded-md border border-[#CFE6B6]">
                <MaterialIcons name="verified" size={12} color="#176B45" />
                <Text className="text-[10px] font-bold text-[#176B45] ml-1">Verified</Text>
              </View>
            </TouchableOpacity>

            <Text className="text-[11px] text-[#9CA3AF] mt-1 px-1">
              Security policy ke tahat registered number locked hai (Update Launching Soon).
            </Text>
          </View>

          {/* Delivery Address with Auto-Detect Button */}
          <View className="mt-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-xs font-bold text-muted">Complete Delivery Address</Text>
              <TouchableOpacity
                disabled={locating}
                onPress={() => void detectCurrentLocation()}
                activeOpacity={0.8}
                className="flex-row items-center px-2.5 py-1 rounded-full bg-[#EAF4D9] border border-[#CFE6B6]"
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#176B45" />
                ) : (
                  <MaterialIcons name="my-location" size={13} color="#176B45" />
                )}
                <Text className="text-[10px] font-black text-[#176B45] ml-1">
                  {locating ? "Detecting..." : "Auto-Detect Location"}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="House / Flat No, Street, Village, Landmark"
              placeholderTextColor="#74847A"
              multiline
              className="rounded-2xl bg-background border border-border px-3.5 py-2.5 text-xs text-foreground font-medium min-h-[72px]"
            />

            {location ? (
              <View className="flex-row items-center mt-2 px-1">
                <MaterialIcons name="check-circle" size={14} color="#176B45" />
                <Text className="text-[10px] font-bold text-[#176B45] ml-1">
                  GPS PIN: {formatCoordinate(location)}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={save}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#176B45",
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 18,
              elevation: 3,
              shadowColor: "#176B45",
              shadowOpacity: 0.25,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "900", color: "#FFFFFF" }}>
              Save Delivery Details
            </Text>
          </TouchableOpacity>
        </View>

        {/* Store Delivery Policy & Operating Hours Card */}
        <View className="rounded-[28px] bg-[#EAF4D9] border border-[#CFE6B6] p-4 mt-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="h-10 w-10 rounded-2xl bg-white items-center justify-center shadow-sm">
                <MaterialIcons name="storefront" size={20} color="#176B45" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[10px] font-black tracking-widest text-[#176B45] uppercase">
                  Local Store Info
                </Text>
                <Text className="text-base font-black text-foreground mt-0.5">
                  {settings.storeName}
                </Text>
              </View>
            </View>
            <MaterialIcons name="verified" size={18} color="#176B45" />
          </View>

          <Text className="text-sm font-black text-foreground mt-3">
            {customerDeliveryStatus(settings.isOpen)}
          </Text>
          <Text className="text-xs leading-5 text-muted mt-1">
            Delivery radius: {settings.deliveryRadius} · Store hours: {settings.hours}
          </Text>
          <Text className="text-[11px] leading-4 text-[#176B45] font-bold mt-2">
            {ownerManagedDeliveryNote}
          </Text>

          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#CFE6B6]">
            <View className="flex-row items-center">
              <MaterialIcons name="call" size={15} color="#176B45" />
              <Text className="text-xs font-bold text-[#14221B] ml-1.5">
                Helpline: {settings.phone ? `+91 ${settings.phone}` : "Not set"}
              </Text>
            </View>
            {settings.phone ? (
              <TouchableOpacity
                onPress={() => void Linking.openURL(`tel:${settings.phone}`)}
                style={{
                  backgroundColor: "#176B45",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFFFFF" }}>Call Store</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ProfileField({
  label,
  value,
  onChange,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View className="mt-3">
      <Text className="text-xs font-bold text-muted mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        className={`rounded-2xl bg-background border border-border px-3.5 py-2.5 text-xs text-foreground font-medium ${
          multiline ? "min-h-[72px]" : ""
        }`}
      />
    </View>
  );
}
