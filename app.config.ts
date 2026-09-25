import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const rawBundleId = "com.app.nivkirana";
const bundleId = rawBundleId.replace(/[-_]/g, ".").replace(/[^a-zA-Z0-9.]/g, "").replace(/\.+/g, ".").replace(/^\.+|\.+$/g, "").toLowerCase().split(".").map((segment) => (/^[a-zA-Z]/.test(segment) ? segment : `x${segment}`)).join(".") || "com.app.nivkirana";
const env = { appName: "NIV Kirana", appSlug: "niv-kirana", logoUrl: "", scheme: "nivkirana", iosBundleId: bundleId, androidPackage: bundleId };

const config: ExpoConfig = {
  name: env.appName, slug: env.appSlug, version: "1.0.0", orientation: "portrait", icon: "./assets/images/icon.png", scheme: env.scheme, userInterfaceStyle: "light",
  ios: { supportsTablet: true, bundleIdentifier: env.iosBundleId, infoPlist: { ITSAppUsesNonExemptEncryption: false, LSApplicationQueriesSchemes: ["tel", "whatsapp", "upi"] } },
  android: { adaptiveIcon: { backgroundColor: "#176B45", foregroundImage: "./assets/images/android-icon-foreground.png", backgroundImage: "./assets/images/android-icon-background.png", monochromeImage: "./assets/images/android-icon-monochrome.png" }, predictiveBackGestureEnabled: false, package: env.androidPackage, permissions: ["POST_NOTIFICATIONS", "CAMERA", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"], intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: env.scheme, host: "*" }], category: ["BROWSABLE", "DEFAULT"] }] },
  web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-secure-store", { configureAndroidBackup: true }],
    ["expo-audio", { microphonePermission: "Allow $(PRODUCT_NAME) to record Voice Orders for NIV Kirana." }],
    ["expo-local-authentication", { faceIDPermission: "Allow $(PRODUCT_NAME) to use Face ID for Owner Dashboard security." }],
    ["expo-camera", { cameraPermission: "Allow $(PRODUCT_NAME) to open the camera and photograph product packets." }],
    ["expo-image-picker", { cameraPermission: "Allow $(PRODUCT_NAME) to photograph product packets for inventory.", photosPermission: "Allow $(PRODUCT_NAME) to select product packet photos for inventory." }],
    ["expo-location", { locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your current location for delivery address and credit verification." }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#FAF8F5", dark: { backgroundColor: "#FAF8F5" } }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } }],
    "expo-font",
    "expo-image",
    "expo-sharing",
    "expo-status-bar",
    "expo-video",
    "expo-web-browser",
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  owner: "sigma1234567880",
  extra: {
    eas: {
      projectId: "715633bf-0a2e-4eda-8c44-2510fc6ae723",
    },
  },
};

export default config;
