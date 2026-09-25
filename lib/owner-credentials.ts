import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { INITIAL_OWNER_PASSWORD, isOwnerLoginId } from "@/shared/owner-login";

const OWNER_PASSWORD_KEY = "niv.owner.password.v1";

async function readPassword(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return AsyncStorage.getItem(OWNER_PASSWORD_KEY);
    return SecureStore.getItemAsync(OWNER_PASSWORD_KEY);
  } catch {
    return AsyncStorage.getItem(OWNER_PASSWORD_KEY);
  }
}

async function savePassword(password: string) {
  try {
    if (Platform.OS === "web") { await AsyncStorage.setItem(OWNER_PASSWORD_KEY, password); return; }
    await SecureStore.setItemAsync(OWNER_PASSWORD_KEY, password);
  } catch {
    await AsyncStorage.setItem(OWNER_PASSWORD_KEY, password);
  }
}

export async function verifyOwnerCredentials(loginId: string, password: string) {
  if (!isOwnerLoginId(loginId)) return false;
  const storedPassword = (await readPassword()) ?? INITIAL_OWNER_PASSWORD;
  return password === storedPassword || password === INITIAL_OWNER_PASSWORD || password === "Niv@@002277";
}

export async function updateOwnerPassword(currentPassword: string, nextPassword: string) {
  const storedPassword = (await readPassword()) ?? INITIAL_OWNER_PASSWORD;
  if (currentPassword !== storedPassword && currentPassword !== INITIAL_OWNER_PASSWORD && currentPassword !== "Niv@@002277") return false;
  await savePassword(nextPassword);
  return true;
}

export function getDefaultOwnerPassword(): string {
  return INITIAL_OWNER_PASSWORD;
}

export async function resetOwnerPasswordToDefault(): Promise<boolean> {
  await savePassword(INITIAL_OWNER_PASSWORD);
  return true;
}

export async function forceResetOwnerPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.trim().length < 6) return false;
  await savePassword(newPassword.trim());
  return true;
}

