import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";
import { useNivStore } from "@/lib/niv-store";

const tabIcons = {
  index: "storefront",
  cart: "shopping-basket",
  orders: "receipt-long",
  assistant: "auto-awesome",
  owner: "admin-panel-settings",
  account: "person",
} as const;

function SupportHubIcon({
  color,
  background,
}: {
  color: string;
  background: string;
}) {
  return (
    <View style={styles.supportHub}>
      <MaterialIcons name="chat" color={color} size={24} />
      <View
        style={[
          styles.whatsappBadge,
          { backgroundColor: background, borderColor: background },
        ]}
      >
        <FontAwesome name="whatsapp" color="#20B15A" size={11} />
      </View>
      <View
        style={[
          styles.micBadge,
          { backgroundColor: background, borderColor: background },
        ]}
      >
        <MaterialIcons name="mic" color={color} size={9} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const { ownerMode, isSignedIn, hydrated, cartCount } = useNivStore();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);

  useEffect(() => {
    if (!hydrated) return;
    if (ownerMode) {
      if (pathname !== "/admin" && !pathname.startsWith("/admin")) {
        router.replace("/admin" as never);
      }
    } else if (!isSignedIn) {
      if (pathname !== "/login") {
        router.replace("/login" as never);
      }
    }
  }, [hydrated, ownerMode, isSignedIn, pathname, router]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAF8F5", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#176B45" />
      </View>
    );
  }

  if (ownerMode || !isSignedIn) {
    return <View style={{ flex: 1, backgroundColor: "#FAF8F5" }} />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarButton: HapticTab as any,
        tabBarActiveTintColor: "#176B45",
        tabBarInactiveTintColor: "#5C6E63",
        tabBarStyle: {
          height: 58 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E2E8D8",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          letterSpacing: 0.2,
          marginTop: -2,
        },
        tabBarIcon: ({ color, size }) =>
          route.name === "support" ? (
            <SupportHubIcon color={String(color)} background={colors.background} />
          ) : (
            <MaterialIcons
              name={tabIcons[route.name as keyof typeof tabIcons]}
              color={color}
              size={size || 22}
            />
          ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Shop" }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#176B45",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "900",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 18,
          },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="support" options={{ title: "Unique Order" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      <Tabs.Screen name="assistant" options={{ href: null }} />
      <Tabs.Screen name="owner" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  supportHub: {
    width: 28,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappBadge: {
    position: "absolute",
    right: -2,
    bottom: -1,
    height: 14,
    width: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  micBadge: {
    position: "absolute",
    left: -1,
    top: -1,
    height: 12,
    width: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
