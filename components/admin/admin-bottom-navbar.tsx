import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { AdminTab } from "./admin-tabs-nav";

interface AdminBottomNavbarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingOrdersCount?: number;
  pendingApprovalsCount?: number;
  lowStockCount?: number;
}

export function AdminBottomNavbar({
  currentTab,
  onSelectTab,
  pendingOrdersCount = 0,
  pendingApprovalsCount = 0,
  lowStockCount = 0,
}: AdminBottomNavbarProps) {
  const insets = useSafeAreaInsets();
  const [moreModalOpen, setMoreModalOpen] = useState(false);
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  const isMoreActive =
    currentTab === "Credit" ||
    currentTab === "Basket" ||
    currentTab === "Settings" ||
    currentTab === "Security" ||
    currentTab === "Scanner";

  const primaryTabs: {
    id: AdminTab;
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    badge?: number;
  }[] = [
    { id: "Overview", label: "Home", icon: "dashboard" },
    {
      id: "Orders",
      label: "Orders",
      icon: "receipt-long",
      badge: pendingOrdersCount,
    },
    {
      id: "Products",
      label: "Stock",
      icon: "inventory-2",
      badge: lowStockCount,
    },
    {
      id: "Customers",
      label: "Users",
      icon: "people-alt",
      badge: pendingApprovalsCount,
    },
  ];

  const moreItems: {
    id: AdminTab;
    label: string;
    description: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
    action?: () => void;
  }[] = [
    {
      id: "Basket",
      label: "NIV Smart Basket",
      description: "Festival combos & curated grocery baskets for customers",
      icon: "auto-awesome",
      color: "#176B45",
    },
    {
      id: "Credit",
      label: "NIV Khata & Udhaar",
      description: "Customer credit limits, balances & ledger",
      icon: "account-balance-wallet",
      color: "#D97706",
    },
    {
      id: "Settings",
      label: "Store Settings",
      description: "Timings, delivery charges & store details",
      icon: "store",
      color: "#176B45",
    },
    {
      id: "Security",
      label: "Security & Passwords",
      description: "Biometric login & console password",
      icon: "lock",
      color: "#5C6E63",
    },
  ];

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingBottom: bottomPadding,
            height: 56 + bottomPadding,
          },
        ]}
      >
        {primaryTabs.map((item) => {
          const active = currentTab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onSelectTab(item.id)}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons
                  name={item.icon}
                  size={22}
                  color={active ? "#176B45" : "#5C6E63"}
                />
                {item.badge && item.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.badge > 99 ? "99+" : item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? "#176B45" : "#5C6E63" },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* More Tab */}
        <TouchableOpacity
          onPress={() => setMoreModalOpen(true)}
          activeOpacity={0.7}
          style={styles.tabButton}
        >
          <View style={styles.iconWrapper}>
            <MaterialIcons
              name="more-horiz"
              size={22}
              color={isMoreActive ? "#176B45" : "#5C6E63"}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              { color: isMoreActive ? "#176B45" : "#5C6E63" },
            ]}
            numberOfLines={1}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* More Options Sheet Modal */}
      <Modal
        visible={moreModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMoreModalOpen(false)}
        >
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>More Admin Panels</Text>
                <Text style={styles.sheetSubtitle}>
                  Khata, Settings & Security
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMoreModalOpen(false)}
                activeOpacity={0.7}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={20} color="#687178" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetList}>
              {moreItems.map((item) => {
                const active = currentTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (item.action) {
                        item.action();
                      } else {
                        onSelectTab(item.id);
                        setMoreModalOpen(false);
                      }
                    }}
                    style={[
                      styles.sheetItem,
                      active && styles.sheetItemActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.sheetItemIcon,
                        { backgroundColor: item.color + "18" },
                      ]}
                    >
                      <MaterialIcons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.sheetItemText}>
                      <Text
                        style={[
                          styles.sheetItemLabel,
                          active && { color: "#176B45", fontWeight: "900" },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={styles.sheetItemDesc}>
                        {item.description}
                      </Text>
                    </View>
                    <MaterialIcons
                      name="chevron-right"
                      size={20}
                      color={active ? "#176B45" : "#CFE6B6"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8D8",
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    position: "relative",
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#176B45",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CFE6B6",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#14221B",
  },
  sheetSubtitle: {
    fontSize: 11,
    color: "#5C6E63",
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FAF8F5",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetList: {
    gap: 10,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FAF8F5",
    borderWidth: 1,
    borderColor: "#E2E8D8",
  },
  sheetItemActive: {
    backgroundColor: "#EAF4D9",
    borderColor: "#CFE6B6",
  },
  sheetItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sheetItemText: {
    flex: 1,
  },
  sheetItemLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#14221B",
  },
  sheetItemDesc: {
    fontSize: 11,
    color: "#5C6E63",
    marginTop: 1,
  },
});
