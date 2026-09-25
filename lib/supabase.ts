import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

import { SUPABASE_CONFIG } from "@/config/app-config";

export const SUPABASE_URL = SUPABASE_CONFIG.url;
export const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

const isServer = typeof window === "undefined";

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isServer) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isServer) return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isServer) return;
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: !isServer && Platform.OS === "web",
  },
});

export type UserRole = "customer" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

export interface ProfileRecord {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email?: string | null;
  address: string;
  location_lat?: number | null;
  location_lng?: number | null;
  status: AccountStatus;
  rejection_reason?: string | null;
  approval_requested_at?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StoreSettingsRecord {
  id: string;
  store_name: string;
  phone: string;
  whatsapp: string;
  upi_id: string;
  upi_enabled: boolean;
  niv_credit_enabled: boolean;
  delivery_radius: string;
  opening_time: string;
  closing_time: string;
  store_lat?: number | null;
  store_lng?: number | null;
  featured_product_ids: string[];
  featured_product_discounts: Record<string, number>;
  catalog_categories: string[];
  updated_at?: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp?: number | null;
  unit: string;
  stock: number;
  icon: string;
  image_url?: string | null;
  image_urls?: string[];
  featured?: boolean;
  variants?: any[];
  barcode?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderRecord {
  id: string;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_lat?: number | null;
  customer_lng?: number | null;
  items: any[];
  total: number;
  original_total?: number | null;
  payment: string;
  fulfillment?: string;
  status: string;
  note?: string | null;
  audio_url?: string | null;
  unavailable_items?: any[];
  confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreditAccountRecord {
  id: string;
  customer_id: string;
  status: "none" | "requested" | "approved" | "declined";
  limit_amount: number;
  used_amount: number;
  enabled: boolean;
  requested_limit?: number | null;
  due_date?: string | null;
  masked_id_last_four?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  document_url?: string | null;
  submitted_at?: string | null;
  updated_at?: string;
}
