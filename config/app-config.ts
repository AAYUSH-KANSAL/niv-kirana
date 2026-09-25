/**
 * Centralized Application Configuration
 *
 * Single source of truth for environment variables, fallback constants,
 * and service configuration across client and server.
 */

export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
};

export const STORE_CONFIG = {
  name: process.env.EXPO_PUBLIC_STORE_NAME || "NIV Kirana",
  phone: process.env.EXPO_PUBLIC_STORE_PHONE || "7060902859",
  whatsapp: process.env.EXPO_PUBLIC_STORE_WHATSAPP || "7060902859",
  upiId: process.env.EXPO_PUBLIC_STORE_UPI_ID || "nivkirana@upi",
  upiEnabled: true,
  nivCreditEnabled: true,
  openingTime: "8:00 AM",
  closingTime: "9:00 PM",
  hours: "8:00 AM – 9:00 PM",
  deliveryRadius: "10 km",
};

export const ADMIN_CONFIG = {
  defaultOwnerEmail: process.env.EXPO_PUBLIC_OWNER_EMAIL || "owner@nivkirana.com",
  defaultOwnerPassword: process.env.EXPO_PUBLIC_OWNER_PASSWORD || "",
  ownerLoginAliases: ["owner", "owner@nivkirana.com", "niv027"],
};

export const API_CONFIG = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000",
  port: parseInt(process.env.PORT || "3000", 10),
};
