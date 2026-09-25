import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { formatIndianTime, indianTimeGreeting } from "@/shared/india-time";

interface CustomerHeaderProps {
  storeName: string;
  customerName?: string;
  deliveryRadius: string;
  cartCount: number;
  now: Date;
  isOpen?: boolean;
}

export function CustomerHeader({
  storeName,
  customerName,
  deliveryRadius,
  cartCount,
  now,
  isOpen = true,
}: CustomerHeaderProps) {
  const router = useRouter();
  const greeting = indianTimeGreeting(now);
  const indiaTime = formatIndianTime(now);
  const displayName = customerName?.trim() || "neighbour";

  return (
    <View className="pt-2 pb-3">
      {/* Top Banner / Store Identity & Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        {/* Left: Kuchesar Road Chopla on top, 10-15 min underneath */}
        <View style={{ flex: 1, marginRight: 10, justifyContent: "center" }}>
          {/* Top (Uppar): Kuchesar Road Chopla */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="location-on" size={15} color="#176B45" />
            <Text
              style={{
                fontSize: 13.5,
                fontWeight: "900",
                color: "#14221B",
                marginLeft: 2,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              Kuchesar Road Chopla
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color="#176B45" />
          </View>

          {/* Bottom (Neeche): 10-15 min & delivery radius */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            {isOpen === false ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  backgroundColor: "#FEF2F2",
                  borderWidth: 1,
                  borderColor: "#FECACA",
                }}
              >
                <View
                  style={{
                    height: 5,
                    width: 5,
                    borderRadius: 2.5,
                    backgroundColor: "#DC2626",
                    marginRight: 4,
                  }}
                />
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#DC2626" }}>
                  Store Closed
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 6,
                    paddingVertical: 1.5,
                    borderRadius: 6,
                    backgroundColor: "#EAF4D9",
                    borderWidth: 1,
                    borderColor: "#CFE6B6",
                    marginRight: 6,
                  }}
                >
                  <MaterialIcons name="flash-on" size={11} color="#176B45" />
                  <Text style={{ fontSize: 10, fontWeight: "900", color: "#176B45", marginLeft: 1 }}>
                    10-15 min
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#5C6E63" }}>
                  {deliveryRadius || "10 km"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Shortcuts: AI Assistant & Cart */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            accessibilityLabel="AI Smart Basket खोलें"
            onPress={() => router.push("/assistant" as never)}
            activeOpacity={0.82}
            style={{
              height: 36,
              width: 36,
              borderRadius: 14,
              backgroundColor: "#EAF4D9",
              borderWidth: 1,
              borderColor: "#CFE6B6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <MaterialIcons name="auto-awesome" size={18} color="#176B45" />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Cart खोलें"
            onPress={() => router.push("/cart" as never)}
            activeOpacity={0.82}
            style={{
              height: 36,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: cartCount > 0 ? "#176B45" : "#EAF4D9",
              borderWidth: 1,
              borderColor: cartCount > 0 ? "#176B45" : "#CFE6B6",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons
              name="shopping-bag"
              size={16}
              color={cartCount > 0 ? "#FFFFFF" : "#176B45"}
            />
            {cartCount > 0 ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  marginLeft: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: "#176B45", fontSize: 10, fontWeight: "900" }}>
                  {cartCount}
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: "#176B45",
                  fontSize: 11,
                  fontWeight: "900",
                  marginLeft: 6,
                  letterSpacing: 0.5,
                }}
              >
                CART
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting & Time Info */}
      <View className="mt-1">
        <Text className="text-[23px] font-black text-[#14221B] tracking-tight">
          {greeting},{" "}
          <Text className="text-[#176B45] font-black">{displayName}</Text>
        </Text>

        {/* India Time */}
        <View className="flex-row items-center mt-1">
          <MaterialIcons name="schedule" size={12} color="#5C6E63" />
          <Text className="text-[11.5px] font-bold text-[#5C6E63] ml-1">
            India time {indiaTime}
          </Text>
        </View>

        {/* Delivering shuddh grocery in Kuchesar Road Chopla underneath */}
        <View className="flex-row items-center mt-0.5">
          <MaterialIcons name="local-shipping" size={12} color="#176B45" />
          <Text className="text-[11.5px] font-semibold text-[#176B45] ml-1">
            Delivering shuddh grocery in Kuchesar Road Chopla
          </Text>
        </View>
      </View>
    </View>
  );
}
