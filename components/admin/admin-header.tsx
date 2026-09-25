import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface AdminHeaderProps {
  storeName: string;
  syncing: boolean;
  lastSyncTime: string;
  isOpen?: boolean;
  onToggleStoreStatus?: () => void;
  onSync: () => void;
  onLogout: () => void;
}

export function AdminHeader({
  storeName,
  syncing,
  lastSyncTime,
  isOpen = true,
  onToggleStoreStatus,
  onSync,
  onLogout,
}: AdminHeaderProps) {
  return (
    <View className="pt-2 pb-2">
      {/* Top Brand Bar */}
      <View className="flex-row justify-between items-center pb-2.5 border-b border-[#E2E8D8]">
        {/* Left Side: Store Logo & Details */}
        <View className="flex-row items-center flex-1 mr-2 min-w-0">
          <View className="h-10 w-10 rounded-2xl bg-[#176B45] items-center justify-center flex-shrink-0">
            <MaterialIcons name="store" size={22} color="#FFFFFF" />
          </View>
          <View className="ml-2.5 flex-1 min-w-0 justify-center">
            <Text
              className="text-[10px] font-black tracking-widest text-[#176B45] uppercase"
              numberOfLines={1}
            >
              Owner Dashboard
            </Text>
            <Text className="text-base font-black text-[#14221B] leading-tight" numberOfLines={1}>
              {storeName || "NIV Kirana"}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <MaterialIcons name="place" size={10} color="#176B45" />
              <Text className="text-[10px] font-bold text-[#5C6E63] ml-0.5" numberOfLines={1}>
                Kuchesar Road Chopla
              </Text>
            </View>
          </View>
        </View>

        {/* Action Controls - Guaranteed flex-shrink-0 to prevent overlap */}
        <View className="flex-row items-center gap-1.5 flex-shrink-0">
          <TouchableOpacity
            accessibilityLabel="Sync data from Supabase Cloud"
            onPress={onSync}
            disabled={syncing}
            activeOpacity={0.75}
            className="h-9 w-9 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#176B45" />
            ) : (
              <MaterialIcons name="sync" size={18} color="#176B45" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Log out admin"
            onPress={onLogout}
            activeOpacity={0.75}
            className="h-9 w-9 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center"
          >
            <MaterialIcons name="logout" size={18} color="#176B45" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Store Status (Open / Close) & Cloud Sync Banner */}
      <View className="mt-2.5" style={{ gap: 10 }}>
        {/* Quick One-Tap Store Status Toggle */}
        {onToggleStoreStatus && (
          <TouchableOpacity
            onPress={onToggleStoreStatus}
            activeOpacity={0.82}
            accessibilityLabel="Toggle store open or close status"
            className="flex-row items-center justify-between px-3 py-2.5 rounded-xl border"
            style={{
              backgroundColor: isOpen ? "#F0FDF4" : "#FEF2F2",
              borderColor: isOpen ? "#BBF7D0" : "#FECACA",
              marginBottom: 2,
            }}
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="h-2.5 w-2.5 rounded-full mr-2"
                style={{ backgroundColor: isOpen ? "#16A34A" : "#DC2626" }}
              />
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: isOpen ? "#15803D" : "#B91C1C" }}
                  >
                    {isOpen ? "🟢 DUKAAN OPEN HAI" : "🔴 DUKAAN CLOSED HAI"}
                  </Text>
                  <View
                    className="ml-2 px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: isOpen ? "#DCFCE7" : "#FEE2E2" }}
                  >
                    <Text
                      className="text-[9px] font-black"
                      style={{ color: isOpen ? "#16A34A" : "#DC2626" }}
                    >
                      {isOpen ? "Accepting Orders" : "Closed for Customers"}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-[10px] font-semibold mt-0.5"
                  style={{ color: isOpen ? "#166534" : "#991B1B" }}
                >
                  {isOpen
                    ? "Tap karein dukan band (close) karne ke liye"
                    : "Tap karein dukan kholne (open) ke liye"}
                </Text>
              </View>
            </View>

            {/* Toggle pill button */}
            <View
              className="px-2.5 py-1.5 rounded-lg flex-shrink-0"
              style={{ backgroundColor: isOpen ? "#16A34A" : "#DC2626" }}
            >
              <Text className="text-[10px] font-black text-white uppercase">
                {isOpen ? "CLOSE KAREIN" : "OPEN KAREIN"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Cloud Sync Status Strip */}
        <View className="flex-row items-center justify-between bg-white border border-[#E2E8D8] rounded-xl px-3 py-2">
          <View className="flex-row items-center flex-1">
            <View className="h-2 w-2 rounded-full bg-[#176B45] mr-2" />
            <Text className="text-[11px] text-[#5C6E63] font-semibold" numberOfLines={1}>
              Live Cloud Sync · Updated {lastSyncTime}
            </Text>
          </View>
          <TouchableOpacity onPress={onSync} disabled={syncing}>
            <Text className="text-[11px] text-[#176B45] font-black ml-2">
              {syncing ? "Syncing..." : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
