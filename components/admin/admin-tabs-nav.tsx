import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export type AdminTab =
  | "Overview"
  | "Orders"
  | "Products"
  | "Customers"
  | "Scanner"
  | "Credit"
  | "Basket"
  | "Settings"
  | "Security";

interface TabItem {
  id: AdminTab;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  badge?: number;
}

interface AdminTabsNavProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingOrdersCount?: number;
  pendingApprovalsCount?: number;
  lowStockCount?: number;
}

export function AdminTabsNav({
  currentTab,
  onSelectTab,
  pendingOrdersCount = 0,
  pendingApprovalsCount = 0,
  lowStockCount = 0,
}: AdminTabsNavProps) {
  const tabs: TabItem[] = [
    { id: "Overview", label: "Overview", icon: "dashboard" },
    { id: "Orders", label: "Orders", icon: "receipt-long", badge: pendingOrdersCount },
    { id: "Products", label: "Products", icon: "inventory-2", badge: lowStockCount },
    { id: "Customers", label: "Customers", icon: "people-alt", badge: pendingApprovalsCount },
    { id: "Basket", label: "Smart Basket", icon: "auto-awesome" },
    { id: "Scanner", label: "Scanner", icon: "qr-code-scanner" },
    { id: "Credit", label: "Khata", icon: "account-balance-wallet" },
    { id: "Settings", label: "Settings", icon: "store" },
    { id: "Security", label: "Security", icon: "lock" },
  ];

  return (
    <View className="py-2.5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 2 }}
      >
        <View className="flex-row items-center gap-1.5">
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onSelectTab(tab.id)}
                activeOpacity={0.8}
                className={`flex-row items-center px-3.5 py-2 rounded-xl border ${
                  active
                    ? "bg-[#176B45] border-[#176B45]"
                    : "bg-white border-[#E2E8D8]"
                }`}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={15}
                  color={active ? "#FFFFFF" : "#5C6E63"}
                />
                <Text
                  className={`text-xs font-bold ml-1.5 ${
                    active ? "text-white" : "text-[#14221B]"
                  }`}
                >
                  {tab.label}
                </Text>

                {tab.badge && tab.badge > 0 ? (
                  <View
                    style={{
                      backgroundColor: active ? "rgba(255, 255, 255, 0.3)" : "#EAF4D9",
                    }}
                    className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  >
                    <Text
                      className={`text-[9px] font-black ${
                        active ? "text-white" : "text-[#176B45]"
                      }`}
                    >
                      {tab.badge}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
