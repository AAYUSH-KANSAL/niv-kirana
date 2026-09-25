import { supabase } from "./supabase";
import type { ProfileRecord, ProductRecord, OrderRecord, StoreSettingsRecord, CreditAccountRecord } from "./supabase";
import type { CartLine, CustomerProfile, Order, Product, StoreSettings, FestivalBasket } from "./niv-store";
import type { UnavailableOrderItem } from "../shared/order-revision";
import { normalizeIndianMobile } from "../shared/local-account-rules";
import { verifyOwnerCredentials } from "./owner-credentials";

// ── Auth Services ─────────────────────────────────────────────────────────────

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function fetchProfile(userId: string): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) {
    console.warn("fetchProfile error", error);
    return null;
  }
  return data as ProfileRecord;
}

export async function signUpCustomer(params: {
  phone: string;
  name: string;
  email: string;
  password?: string;
  address?: string;
  locationLat?: number;
  locationLng?: number;
}) {
  const normalizedPhone = normalizeIndianMobile(params.phone);
  const cleanEmail = params.email.trim().toLowerCase();
  const password = params.password || `Niv@${normalizedPhone.slice(-4)}`;

  // 1. Check if phone already exists in profiles
  const { data: existingPhone } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (existingPhone) {
    throw new Error("User already exists with this mobile number");
  }

  // 2. Check if email already exists in profiles
  const { data: existingEmail } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", cleanEmail)
    .maybeSingle();

  if (existingEmail) {
    throw new Error("User already exists with this email address");
  }

  // 3. Register user with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: params.name.trim(),
        phone: normalizedPhone,
        role: "customer",
      },
    },
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already registered")) {
      throw new Error("User already exists with this email address");
    }
    throw error;
  }
  if (!data.user) throw new Error("Customer registration failed");
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error("User already exists with this email address");
  }

  // 4. Upsert profile record with pending status
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: data.user.id,
    role: "customer",
    name: params.name.trim(),
    phone: normalizedPhone,
    email: cleanEmail,
    address: params.address || "",
    location_lat: params.locationLat,
    location_lng: params.locationLng,
    status: "pending",
    approval_requested_at: new Date().toISOString(),
  });

  if (profileError) {
    console.warn("Error upserting profile:", profileError);
  }

  // 5. Sign out immediately so unapproved user cannot access protected resources
  await supabase.auth.signOut();

  return { user: data.user, isNew: true, status: "pending" as const };
}

export async function signInUnified(params: {
  identifier: string;
  password: string;
}) {
  const raw = params.identifier.trim();
  const password = params.password;

  // 1. Check if Admin credentials (direct owner credentials)
  const isDirectAdmin =
    raw.toLowerCase() === "owner" ||
    raw.toLowerCase() === "niv027" ||
    raw.toLowerCase() === "owner@nivkirana.com";

  if (isDirectAdmin) {
    const valid = await verifyOwnerCredentials(raw, password);
    if (valid) {
      try {
        const adminEmail = raw.includes("@") ? raw : `${raw}@nivkirana.com`;
        await supabase.auth.signInWithPassword({ email: adminEmail, password });
      } catch (e) {
        console.warn("Admin Supabase session signin warning:", e);
      }
      return { role: "admin" as const, status: "approved" as const, name: "Store Admin" };
    }
  }

  // 2. Determine if identifier is Email or Mobile
  const isEmail = raw.includes("@");
  let targetEmail = "";
  let targetPhone = "";
  let profile: ProfileRecord | null = null;

  if (isEmail) {
    targetEmail = raw.toLowerCase();
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", targetEmail)
      .maybeSingle();

    if (!prof) {
      throw new Error("This is not registered email");
    }
    profile = prof as ProfileRecord;
    targetPhone = profile.phone || "";
  } else {
    const normalized = normalizeIndianMobile(raw);
    if (normalized.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number or email");
    }
    targetPhone = normalized;
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", targetPhone)
      .maybeSingle();

    if (!prof) {
      throw new Error("This mobile number is not registered.");
    }
    profile = prof as ProfileRecord;
    targetEmail = profile.email || `${targetPhone}@customer.nivkirana.com`;
  }

  // 3. Authenticate with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes("invalid login credentials")) {
      throw new Error("Incorrect password. Please try again.");
    }
    throw authError;
  }

  const freshProfile = (await fetchProfile(authData.user.id)) || profile;

  // 4. Role and Status checks (RBAC)
  if (freshProfile?.role === "admin") {
    return { role: "admin" as const, user: authData.user, profile: freshProfile, status: "approved" as const };
  }

  if (freshProfile?.status === "pending") {
    await supabase.auth.signOut();
    throw new Error(
      "Approval Pending: Aapka account abhi Admin approval ke liye pending hai. Admin dwara approve hone ke baad hi aap shopping aur access kar payenge."
    );
  }

  if (freshProfile?.status === "rejected") {
    await supabase.auth.signOut();
    throw new Error(
      "Request declined: " + (freshProfile.rejection_reason || "Admin ne aapka account approve nahi kiya hai.")
    );
  }

  if (freshProfile?.status === "suspended") {
    await supabase.auth.signOut();
    throw new Error("Account suspended: Aapka account temporarily suspend kiya gaya hai.");
  }

  return {
    role: "customer" as const,
    user: authData.user,
    profile: freshProfile,
    status: "approved" as const,
  };
}

export async function signInCustomer(phone: string, password?: string) {
  return signInUnified({ identifier: phone, password: password || `Niv@${phone.slice(-4)}` });
}

export async function signInAdmin(emailOrId: string, password: string) {
  const result = await signInUnified({ identifier: emailOrId, password });
  if (result.role !== "admin") {
    throw new Error("Access restricted: This account does not have Admin privileges.");
  }
  return result;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ── Products & Inventory ──────────────────────────────────────────────────────

export async function fetchProductsFromDb(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) {
    console.warn("fetchProductsFromDb error", error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price),
    mrp: item.mrp ? Number(item.mrp) : undefined,
    unit: item.unit,
    stock: item.stock,
    icon: item.icon || "📦",
    imageUrl: item.image_url || undefined,
    imageUrls: item.image_urls || [],
    featured: Boolean(item.featured),
    variants: item.variants || [],
    barcode: item.barcode || undefined,
    description: item.description || undefined,
  }));
}

export async function addProductToDb(product: Omit<Product, "id"> & { id?: string; barcode?: string }) {
  try {
    const id = String(product.id || product.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-") + "-" + Date.now().toString().slice(-4));
    const payload = {
      id,
      name: String(product.name),
      category: String(product.category || "Staples"),
      price: Number(product.price) || 0,
      mrp: product.mrp !== undefined && product.mrp !== null ? Number(product.mrp) : null,
      unit: String(product.unit || "1 pack"),
      stock: product.stock !== undefined ? Math.round(Number(product.stock)) : 10,
      icon: String(product.icon || "📦"),
      image_url: product.imageUrl ? String(product.imageUrl) : null,
      image_urls: product.imageUrls || [],
      featured: Boolean(product.featured),
      variants: product.variants || [],
      barcode: product.barcode ? String(product.barcode) : null,
      description: product.description ? String(product.description) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("addProductToDb error", error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("addProductToDb exception", err);
    return null;
  }
}

export async function updateProductInDb(id: string, updates: Partial<Product & { barcode?: string }>) {
  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = String(updates.name);
    if (updates.category !== undefined) payload.category = String(updates.category);
    if (updates.price !== undefined) payload.price = Number(updates.price);
    if (updates.mrp !== undefined) payload.mrp = updates.mrp !== null ? Number(updates.mrp) : null;
    if (updates.unit !== undefined) payload.unit = String(updates.unit);
    if (updates.stock !== undefined) payload.stock = Math.round(Number(updates.stock));
    if (updates.icon !== undefined) payload.icon = String(updates.icon);
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl ? String(updates.imageUrl) : null;
    if (updates.imageUrls !== undefined) payload.image_urls = updates.imageUrls || [];
    if (updates.featured !== undefined) payload.featured = Boolean(updates.featured);
    if (updates.variants !== undefined) payload.variants = updates.variants || [];
    if (updates.barcode !== undefined) payload.barcode = updates.barcode ? String(updates.barcode) : null;
    if (updates.description !== undefined) payload.description = updates.description ? String(updates.description) : null;

    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", String(id))
      .select()
      .maybeSingle();

    if (error) {
      console.warn("updateProductInDb error", error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("updateProductInDb exception", err);
    return null;
  }
}

export async function deleteProductFromDb(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

function cleanBase64(str: string): string {
  if (!str) return "";
  const s = str.includes(",") ? str.split(",")[1] : str;
  return s.replace(/[\r\n\t\s]/g, "");
}

function decodeBase64ToUint8(base64: string): Uint8Array {
  const clean = cleanBase64(base64);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const len = clean.length;
  let bufferLength = Math.floor(len * 0.75);
  if (clean[len - 1] === "=") bufferLength--;
  if (clean[len - 2] === "=") bufferLength--;
  const bytes = new Uint8Array(Math.max(0, bufferLength));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(clean[i]);
    const c2 = chars.indexOf(clean[i + 1]);
    const c3 = chars.indexOf(clean[i + 2]);
    const c4 = chars.indexOf(clean[i + 3]);
    if (c1 === -1 || c2 === -1) break;
    if (p < bufferLength) bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (c3 !== -1 && clean[i + 2] !== "=" && p < bufferLength) {
      bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    }
    if (c4 !== -1 && clean[i + 3] !== "=" && p < bufferLength) {
      bytes[p++] = ((c3 & 3) << 6) | (c4 & 63);
    }
  }
  return bytes;
}

function encodeUint8ToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === "function") {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return globalThis.btoa(binary);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let base64 = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += i + 1 < len ? chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)] : "=";
    base64 += i + 2 < len ? chars[bytes[i + 2] & 63] : "=";
  }
  return base64;
}

export async function uploadProductImageToSupabase(params: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const { uri, base64: initialBase64, mimeType } = params;
  let b64 = initialBase64 ? cleanBase64(initialBase64) : null;

  // Only compress if base64 was not already provided
  if (!b64) {
    try {
      const { compressImageUnder60Kb } = await import("./image-compressor");
      const compressed = await compressImageUnder60Kb(uri, { maxKb: 50, initialWidth: 480 });
      if (compressed.base64) {
        b64 = cleanBase64(compressed.base64);
      }
    } catch (compErr) {
      console.warn("Product image compression warning:", compErr);
    }
  }

  // Fallback read from file system if still no base64
  if (!b64 && uri && !uri.startsWith("http")) {
    try {
      let legacyFs: any = null;
      try {
        legacyFs = await import("expo-file-system/legacy");
      } catch {
        legacyFs = await import("expo-file-system");
      }
      if (legacyFs && typeof legacyFs.readAsStringAsync === "function") {
        const raw = await legacyFs.readAsStringAsync(uri, {
          encoding: legacyFs.EncodingType?.Base64 ?? "base64",
        });
        if (raw) b64 = cleanBase64(raw);
      }
    } catch (e) {
      console.warn("FileSystem read failed:", e);
    }
  }

  const ext = (mimeType?.split("/")[1] || uri.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const cleanExt =
    ext === "png" ? "png" : ext === "webp" ? "webp" : "jpg";
  const contentType =
    cleanExt === "png"
      ? "image/png"
      : cleanExt === "webp"
      ? "image/webp"
      : "image/jpeg";
  const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

  // Safe Supabase Storage upload with automatic Data URI fallback (zero crash, zero restart)
  if (b64) {
    try {
      const bytes = decodeBase64ToUint8(b64);
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, bytes, { contentType, upsert: true });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      } else {
        console.warn("Supabase storage product upload warning:", error);
      }
    } catch (storageErr) {
      console.warn("Supabase storage product upload exception:", storageErr);
    }

    // Resilient fallback: data URI (already compressed to under 45 KB)
    return `data:${contentType};base64,${b64}`;
  }

  // Last-resort fallback: return original URI if already http
  if (uri.startsWith("http")) return uri;
  return "";
}

export async function uploadCreditDocumentToSupabase(params: {
  side: "front" | "back";
  uri?: string;
  base64?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const { side, uri, base64: initialBase64 } = params;
  let b64 = initialBase64 ? cleanBase64(initialBase64) : null;

  if (!b64 && uri) {
    try {
      const { compressImageUnder60Kb } = await import("./image-compressor");
      const compressed = await compressImageUnder60Kb(uri, { maxKb: 48, initialWidth: 480 });
      if (compressed.base64) {
        b64 = cleanBase64(compressed.base64);
      }
    } catch (compErr) {
      console.warn("Credit document compression warning:", compErr);
    }
  }

  const fileName = `${side}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  if (b64) {
    try {
      const bytes = decodeBase64ToUint8(b64);
      const { error } = await supabase.storage
        .from("credit-documents")
        .upload(fileName, bytes, { contentType: "image/jpeg", upsert: true });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from("credit-documents")
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Credit doc storage upload exception:", storageErr);
    }

    return `data:image/jpeg;base64,${b64}`;
  }

  return "";
}

export async function uploadVoiceAudioToSupabase(uri: string): Promise<string> {
  if (!uri || !uri.trim()) return "";
  const trimmed = uri.trim();

  // If already a remote public URL or data URI, return directly (unless it's a local blob: URL)
  if (
    (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) &&
    !trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  let bytes: Uint8Array | null = null;
  let b64: string | null = null;

  // 1. Try reading via expo-file-system/legacy first (for native file:// URIs)
  if (!trimmed.startsWith("blob:") && !trimmed.startsWith("http")) {
    try {
      let legacyFs: any = null;
      try {
        legacyFs = await import("expo-file-system/legacy");
      } catch {
        legacyFs = await import("expo-file-system");
      }
      if (legacyFs && typeof legacyFs.getInfoAsync === "function") {
        const info = await legacyFs.getInfoAsync(trimmed);
        if (info.exists) {
          b64 = await legacyFs.readAsStringAsync(trimmed, {
            encoding: legacyFs.EncodingType?.Base64 ?? "base64",
          });
          if (b64) {
            const cleanB64 = b64.includes(",") ? b64.split(",")[1] : b64;
            bytes = decodeBase64ToUint8(cleanB64);
          }
        }
      }
    } catch {
      // Gracefully fall through to fetch ArrayBuffer
    }
  }

  // 2. Fetch as ArrayBuffer (for Web, blob: URLs, or if FileSystem was unavailable)
  // res.arrayBuffer() is universally supported and NEVER throws Blob errors!
  if (!bytes) {
    try {
      const res = await fetch(trimmed);
      const arrayBuffer = await res.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      b64 = encodeUint8ToBase64(bytes);
    } catch (fetchErr) {
      console.warn("Fetch arrayBuffer audio error:", fetchErr);
    }
  }

  // 3. Upload bytes to Supabase Storage (try niv-uploads first, then product-images)
  if (bytes && bytes.length > 0) {
    const fileName = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.m4a`;
    for (const bucket of ["niv-uploads", "product-images"]) {
      try {
        const { error } = await supabase.storage
          .from(bucket)
          .upload(fileName, bytes, { contentType: "audio/m4a", upsert: true });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
          if (urlData?.publicUrl) {
            return urlData.publicUrl;
          }
        } else {
          console.warn(`Bucket ${bucket} upload error:`, error);
        }
      } catch (storageErr) {
        console.warn(`Exception uploading audio to ${bucket}:`, storageErr);
      }
    }
  }

  // 4. Absolute Fallback: Return playable Data URI so audio is preserved everywhere
  if (b64) {
    const cleanB64 = b64.includes(",") ? b64.split(",")[1] : b64;
    return `data:audio/m4a;base64,${cleanB64}`;
  }

  return trimmed;
}

export async function lookupProductByBarcode(barcode: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    price: Number(data.price),
    mrp: data.mrp ? Number(data.mrp) : undefined,
    unit: data.unit,
    stock: data.stock,
    icon: data.icon || "📦",
    imageUrl: data.image_url || undefined,
    imageUrls: data.image_urls || [],
    featured: Boolean(data.featured),
    variants: data.variants || [],
    barcode: data.barcode,
    description: data.description || undefined,
  };
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function fetchCustomerOrdersFromDb(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapDbOrderToClientOrder);
}

export async function fetchAllOrdersForAdmin(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapDbOrderToClientOrder);
}

export async function createOrderInDb(order: {
  id: string;
  customerId?: string;
  customer: CustomerProfile;
  items: CartLine[];
  total: number;
  payment: string;
  fulfillment?: string;
  note?: string;
  audioUrl?: string;
}) {
  try {
    const { data, error } = await supabase.from("orders").insert({
      id: String(order.id),
      customer_id: order.customerId ? String(order.customerId) : null,
      customer_name: String(order.customer?.name || ""),
      customer_phone: String(order.customer?.phone || ""),
      customer_address: order.customer?.address ? String(order.customer.address) : "",
      customer_lat: (order.customer?.location?.latitude !== undefined && order.customer?.location?.latitude !== null) ? Number(order.customer.location.latitude) : null,
      customer_lng: (order.customer?.location?.longitude !== undefined && order.customer?.location?.longitude !== null) ? Number(order.customer.location.longitude) : null,
      items: order.items || [],
      total: Number(order.total) || 0,
      payment: String(order.payment || "Cash on delivery"),
      fulfillment: String(order.fulfillment || "delivery"),
      status: "New",
      note: order.note ? String(order.note) : null,
      audio_url: order.audioUrl ? String(order.audioUrl) : null,
    }).select().maybeSingle();

    if (error) {
      console.warn("createOrderInDb error", error);
      return null;
    }
    return data ? mapDbOrderToClientOrder(data) : null;
  } catch (err) {
    console.warn("createOrderInDb exception caught", err);
    return null;
  }
}

export async function updateOrderStatusInDb(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (error) throw error;
}

export async function reviseOrderInDb(orderId: string, items: CartLine[], unavailableItems: UnavailableOrderItem[], newTotal: number) {
  const { error } = await supabase
    .from("orders")
    .update({
      items,
      unavailable_items: unavailableItems,
      total: newTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

export async function updateOrderTotalInDb(orderId: string, total: number) {
  const { error } = await supabase
    .from("orders")
    .update({
      total: Number(total),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) {
    console.warn("updateOrderTotalInDb error:", error);
    throw error;
  }
}

export async function confirmOrderInDb(orderId: string) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "Packed",
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
}

export async function deleteOrderInDb(orderId: string) {
  // Never delete delivered orders as they form permanent sales records
  const { data: existing } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (existing?.status === "Delivered") {
    console.warn(`Cannot delete delivered order #${orderId}. Operation blocked.`);
    return;
  }
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

function mapDbOrderToClientOrder(dbItem: any): Order {
  return {
    id: dbItem.id,
    items: dbItem.items || [],
    customer: {
      name: dbItem.customer_name || "",
      phone: dbItem.customer_phone || "",
      address: dbItem.customer_address || "",
      location: dbItem.customer_lat && dbItem.customer_lng ? { latitude: Number(dbItem.customer_lat), longitude: Number(dbItem.customer_lng) } : undefined,
    },
    payment: dbItem.payment as any,
    fulfillment: dbItem.fulfillment as any,
    status: dbItem.status as any,
    total: Number(dbItem.total),
    originalTotal: dbItem.original_total ? Number(dbItem.original_total) : undefined,
    unavailableItems: dbItem.unavailable_items || [],
    note: dbItem.note || undefined,
    audioUri: dbItem.audio_url || undefined,
    confirmedAt: dbItem.confirmed_at || undefined,
    createdAt: dbItem.created_at || new Date().toISOString(),
  };
}

// ── Customer Approvals & CRM ──────────────────────────────────────────────────

export async function fetchAllProfiles(): Promise<ProfileRecord[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ProfileRecord[];
}

export async function approveCustomerInDb(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function setCustomerRoleInDb(userId: string, role: "customer" | "admin") {
  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function setCustomerStatusInDb(
  userId: string,
  status: "pending" | "approved" | "rejected" | "suspended",
  reason?: string
) {
  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "approved") {
    updatePayload.approved_at = new Date().toISOString();
    updatePayload.rejection_reason = null;
  } else if (status === "rejected" || status === "suspended") {
    updatePayload.rejection_reason = reason || (status === "suspended" ? "Account suspended by Admin" : "Account rejected by Admin");
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);
  if (error) throw error;
}

export async function rejectCustomerInDb(userId: string, reason?: string) {
  const { error } = await supabase
    .from("profiles")
    .update({
      status: "rejected",
      rejection_reason: reason || "Owner has declined this account request.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function deleteCustomerFromDb(
  params: { id?: string; phone?: string; email?: string } | string,
  legacyPhone?: string
) {
  try {
    const id = typeof params === "string" ? params : params.id;
    const phone = typeof params === "string" ? legacyPhone : params.phone;
    const email = typeof params === "string" ? undefined : params.email;

    const cleanPhone = phone
      ? normalizeIndianMobile(phone)
      : id?.startsWith("customer-")
      ? id.replace("customer-", "")
      : "";

    // 1. If UUID is provided directly, clean up profile and credit account, but PRESERVE orders
    if (id && !id.startsWith("customer-")) {
      await supabase.from("credit_accounts").delete().eq("customer_id", id);
      await supabase.from("profiles").delete().eq("id", id);
    }

    // 2. Also look up and delete by phone (profile & credit account only)
    if (cleanPhone) {
      const { data: p } = await supabase.from("profiles").select("id").eq("phone", cleanPhone).maybeSingle();
      if (p?.id) {
        await supabase.from("credit_accounts").delete().eq("customer_id", p.id);
        await supabase.from("profiles").delete().eq("id", p.id);
      }
      await supabase.from("profiles").delete().eq("phone", cleanPhone);
    }

    // 3. Also look up and delete by email (profile & credit account only)
    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const { data: p } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
      if (p?.id) {
        await supabase.from("credit_accounts").delete().eq("customer_id", p.id);
        await supabase.from("profiles").delete().eq("id", p.id);
      }
      await supabase.from("profiles").delete().eq("email", cleanEmail);
    }
  } catch (error) {
    console.warn("deleteCustomerFromDb error", error);
  }
}

// ── Store Settings ────────────────────────────────────────────────────────────

export async function fetchStoreSettingsFromDb(): Promise<StoreSettings> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", "default")
    .single();

  if (error || !data) {
    return {
      storeName: "NIV Kirana",
      phone: "7060902859",
      whatsapp: "7060902859",
      upiId: "nivkirana@upi",
      upiEnabled: true,
      nivCreditEnabled: true,
      deliveryRadius: "10 km",
      openingTime: "8:00 AM",
      closingTime: "9:00 PM",
      hours: "8:00 AM – 9:00 PM",
      isOpen: true,
      catalogCategories: ["All", "Staples", "Pulses", "Dairy", "Fresh", "Snacks", "Home care", "Personal care", "Beverages"],
    };
  }

  return {
    storeName: data.store_name,
    phone: data.phone,
    whatsapp: data.whatsapp,
    upiId: data.upi_id,
    upiEnabled: data.upi_enabled,
    nivCreditEnabled: data.niv_credit_enabled,
    deliveryRadius: data.delivery_radius,
    openingTime: data.opening_time,
    closingTime: data.closing_time,
    hours: `${data.opening_time} – ${data.closing_time}`,
    isOpen: data.is_open !== false,
    storeLocation: data.store_lat && data.store_lng ? { latitude: data.store_lat, longitude: data.store_lng } : undefined,
    featuredProductIds: data.featured_product_ids || [],
    featuredProductDiscounts: data.featured_product_discounts || {},
    catalogCategories:
      data.catalog_categories && Array.isArray(data.catalog_categories) && data.catalog_categories.length > 0
        ? data.catalog_categories
        : ["All", "Staples", "Pulses", "Dairy", "Fresh", "Snacks", "Beverages", "Home care", "Personal care"],
  };
}

export async function updateStoreSettingsInDb(updates: Partial<StoreSettings>) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.storeName !== undefined) payload.store_name = updates.storeName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp;
  if (updates.upiId !== undefined) payload.upi_id = updates.upiId;
  if (updates.upiEnabled !== undefined) payload.upi_enabled = updates.upiEnabled;
  if (updates.nivCreditEnabled !== undefined) payload.niv_credit_enabled = updates.nivCreditEnabled;
  if (updates.deliveryRadius !== undefined) payload.delivery_radius = updates.deliveryRadius;
  if (updates.openingTime !== undefined) payload.opening_time = updates.openingTime;
  if (updates.closingTime !== undefined) payload.closing_time = updates.closingTime;
  if (updates.isOpen !== undefined) payload.is_open = updates.isOpen;
  if (updates.storeLocation !== undefined) {
    payload.store_lat = updates.storeLocation?.latitude;
    payload.store_lng = updates.storeLocation?.longitude;
  }
  if (updates.featuredProductIds !== undefined) payload.featured_product_ids = updates.featuredProductIds;
  if (updates.featuredProductDiscounts !== undefined) payload.featured_product_discounts = updates.featuredProductDiscounts;
  if (updates.catalogCategories !== undefined) payload.catalog_categories = updates.catalogCategories;

  const { error } = await supabase
    .from("store_settings")
    .upsert({ id: "default", ...payload });
  if (error) throw error;
}

// ── Festival Basket ──────────────────────────────────────────────────────────

export async function fetchFestivalBasketFromDb(): Promise<FestivalBasket | null> {
  const { data, error } = await supabase
    .from("festival_baskets")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id || "default",
    title: data.title || "Festival Special Basket",
    occasion: data.occasion || "Festival",
    description: data.description || "",
    items: data.items || [],
    published: data.published ?? true,
    updatedAt: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "Just now",
  };
}

export async function saveFestivalBasketToDb(basket: FestivalBasket): Promise<void> {
  const { error } = await supabase
    .from("festival_baskets")
    .upsert({
      id: basket.id || "default",
      title: basket.title,
      occasion: basket.occasion,
      description: basket.description,
      items: basket.items,
      published: basket.published,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    console.warn("saveFestivalBasketToDb error:", error);
    throw error;
  }
}

// ── Credit Accounts & Unified Admin Fetch ─────────────────────────────────────

export async function upsertCustomerProfileInDb(profile: {
  id: string;
  name: string;
  phone: string;
  address: string;
  location?: { latitude: number; longitude: number };
  status?: string;
  approvalRequestedAt?: string;
}) {
  const { data, error } = await supabase.from("profiles").upsert({
    id: profile.id,
    role: "customer",
    name: profile.name,
    phone: profile.phone,
    address: profile.address,
    location_lat: profile.location?.latitude,
    location_lng: profile.location?.longitude,
    status: profile.status || "pending",
    approval_requested_at: profile.approvalRequestedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().maybeSingle();
  if (error) console.warn("upsertCustomerProfileInDb error", error);
  return data;
}

export async function fetchCreditAccountsFromDb(): Promise<CreditAccountRecord[]> {
  const { data, error } = await supabase.from("credit_accounts").select("*");
  if (error || !data) return [];
  return data as CreditAccountRecord[];
}

export async function deleteCreditAccountInDb(customerId: string) {
  try {
    const { error } = await supabase.from("credit_accounts").delete().eq("customer_id", customerId);
    if (error) console.warn("deleteCreditAccountInDb error:", error);
  } catch (err) {
    console.warn("deleteCreditAccountInDb caught error:", err);
  }
}

export async function upsertCreditAccountInDb(credit: {
  customerId: string;
  status: "none" | "requested" | "approved" | "declined";
  limitAmount: number;
  usedAmount: number;
  enabled: boolean;
  requestedLimit?: number | null;
  dueDate?: string | null;
  verification?: any;
}) {
  try {
    const payload: any = {
      customer_id: String(credit.customerId),
      status: credit.status,
      limit_amount: Number(credit.limitAmount) || 0,
      used_amount: Number(credit.usedAmount) || 0,
      enabled: Boolean(credit.enabled),
      requested_limit: credit.requestedLimit !== undefined && credit.requestedLimit !== null ? Number(credit.requestedLimit) : null,
      due_date: credit.dueDate ? String(credit.dueDate) : null,
      updated_at: new Date().toISOString(),
    };

    if (credit.verification) {
      if (credit.verification.latitude !== undefined && credit.verification.latitude !== null) {
        payload.location_lat = Number(credit.verification.latitude);
      }
      if (credit.verification.longitude !== undefined && credit.verification.longitude !== null) {
        payload.location_lng = Number(credit.verification.longitude);
      }
      if (credit.verification.frontDocumentUrl) {
        payload.document_url = String(credit.verification.frontDocumentUrl);
      }
      if (credit.verification.backDocumentUrl) {
        payload.back_document_url = String(credit.verification.backDocumentUrl);
      }
      if (credit.verification.maskedIdLastFour) {
        payload.masked_id_last_four = String(credit.verification.maskedIdLastFour);
      }
      payload.submitted_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from("credit_accounts").upsert(payload, { onConflict: "customer_id" }).select().maybeSingle();
    if (error) console.warn("upsertCreditAccountInDb error", error);

    // If an address is provided in verification, also update profiles table for this customer
    if (credit.verification?.address && credit.customerId) {
      void supabase.from("profiles").update({
        address: String(credit.verification.address).trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", String(credit.customerId));
    }

    return data;
  } catch (err) {
    console.warn("upsertCreditAccountInDb caught error:", err);
    return null;
  }
}

export interface FullAdminData {
  profiles: ProfileRecord[];
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
  creditAccounts: CreditAccountRecord[];
  festivalBasket: FestivalBasket | null;
}

export async function fetchFullAdminData(): Promise<FullAdminData> {
  const [profiles, orders, products, settings, creditAccounts, festivalBasket] = await Promise.all([
    fetchAllProfiles(),
    fetchAllOrdersForAdmin(),
    fetchProductsFromDb(),
    fetchStoreSettingsFromDb(),
    fetchCreditAccountsFromDb(),
    fetchFestivalBasketFromDb(),
  ]);
  return { profiles, orders, products, settings, creditAccounts, festivalBasket };
}
