import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CustomerProfile } from "@/lib/niv-store";

export type VoiceOrderStatus = "Received" | "Bill being prepared" | "Confirmed";
export type VoiceOrder = {
  id: string;
  customer: CustomerProfile;
  audioUri: string;
  createdAt: string;
  status: VoiceOrderStatus;
};

const VOICE_ORDERS_KEY = "niv-kirana-voice-orders-v1";

export async function readVoiceOrders() {
  try {
    const raw = await AsyncStorage.getItem(VOICE_ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as VoiceOrder[] : [];
  } catch {
    return [];
  }
}

export async function saveVoiceOrder(customer: CustomerProfile, audioUri: string) {
  const next: VoiceOrder = {
    id: `NIV-VOICE-${Date.now()}`,
    customer,
    audioUri,
    createdAt: new Date().toISOString(),
    status: "Received",
  };
  const current = await readVoiceOrders();
  await AsyncStorage.setItem(VOICE_ORDERS_KEY, JSON.stringify([next, ...current]));
  return next;
}

export async function updateVoiceOrderStatus(id: string, status: VoiceOrderStatus) {
  const current = await readVoiceOrders();
  const next = current.map((order) => order.id === id ? { ...order, status } : order);
  await AsyncStorage.setItem(VOICE_ORDERS_KEY, JSON.stringify(next));
  return next;
}

export async function clearVoiceOrders() {
  await AsyncStorage.removeItem(VOICE_ORDERS_KEY);
}
