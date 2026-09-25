import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

const OWNER_BIOMETRIC_KEY = "niv.owner.biometric.enabled.v1";

export type BiometricResult = { success: true } | { success: false; reason: "unavailable" | "cancelled" | "failed" };

export async function isOwnerBiometricEnabled() {
  return (await AsyncStorage.getItem(OWNER_BIOMETRIC_KEY)) === "true";
}

export async function setOwnerBiometricEnabled(enabled: boolean) {
  await AsyncStorage.setItem(OWNER_BIOMETRIC_KEY, enabled ? "true" : "false");
}

export async function verifyOwnerBiometric(): Promise<BiometricResult> {
  if (Platform.OS === "web") return { success: false, reason: "unavailable" };
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!hasHardware || !isEnrolled) return { success: false, reason: "unavailable" };
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock NIV Owner Dashboard",
    promptDescription: "Fingerprint से Owner Dashboard खोलें",
    cancelLabel: "Cancel",
    biometricsSecurityLevel: "strong",
    disableDeviceFallback: false,
  });
  if (result.success) return { success: true };
  if (result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel") return { success: false, reason: "cancelled" };
  return { success: false, reason: "failed" };
}
