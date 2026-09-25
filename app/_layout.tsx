import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { ActivityIndicator, LogBox, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import "@/lib/_core/nativewind-pressable";
import { NivStoreProvider, useNivStore } from "@/lib/niv-store";
import { ThemeProvider } from "@/lib/theme-provider";
import { createTRPCClient, trpc } from "@/lib/trpc";

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
  "\"shadow*\" style props are deprecated",
  "[Reanimated]",
  "Method getInfoAsync imported from \"expo-file-system\" is deprecated",
  "Method readAsStringAsync imported from \"expo-file-system\" is deprecated",
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = { initialRouteName: "(tabs)" };

function RootNavigator() {
  const { hydrated } = useNivStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF9EF", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#176B45" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin/index" />
      <Stack.Screen name="credit-verification" />
      <Stack.Screen name="product/[id]" />
      <Stack.Screen name="login" />
      <Stack.Screen name="oauth/callback" />
    </Stack>
  );
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return { ...metrics, insets: { ...metrics.insets, top: Math.max(metrics.insets.top, 16), bottom: Math.max(metrics.insets.bottom, 12) } };
  }, [initialFrame, initialInsets]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
          <StatusBar style="dark" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  return (
    <ThemeProvider>
      <NivStoreProvider>
        {Platform.OS === "web" ? (
          <SafeAreaProvider initialMetrics={providerInitialMetrics}>
            <SafeAreaFrameContext.Provider value={frame}>
              <SafeAreaInsetsContext.Provider value={insets}>
                {content}
              </SafeAreaInsetsContext.Provider>
            </SafeAreaFrameContext.Provider>
          </SafeAreaProvider>
        ) : (
          <SafeAreaProvider initialMetrics={providerInitialMetrics}>
            {content}
          </SafeAreaProvider>
        )}
      </NivStoreProvider>
    </ThemeProvider>
  );
}
