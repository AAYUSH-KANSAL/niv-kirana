import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { quantityForCart } from "@/shared/cart-quantity";
import { normalizeIndianMobile } from "@/shared/local-account-rules";
import { composeStoreHours } from "@/shared/store-hours";
import { normalizeOrderTimestamp } from "@/shared/customer-database";
import { approvedCredit, cancelledCredit, normalizeCreditAccount } from "@/shared/credit-controls";
import { canManageCatalog } from "@/shared/catalog-access";
import { shouldRecoverLegacyLocalAccount } from "@/shared/local-account-recovery";
import type { CreditVerificationDraft } from "@/shared/credit-verification";
import { collectOwnerOrders, confirmAccountOrder, updateAccountOrderStatus, type OwnerOrder } from "@/shared/owner-order-routing";
import { mergeLegacyVoiceOrders } from "@/shared/voice-order-routing";
import { clearVoiceOrders, readVoiceOrders } from "@/lib/voice-orders";
import type { GeoCoordinate } from "@/shared/delivery-location";
import { DEFAULT_CATALOG_CATEGORIES, usableCatalogCategories } from "@/shared/catalog-categories";
import { revisedOrderTotal, type UnavailableOrderItem } from "@/shared/order-revision";
import type { CheckoutPaymentMethod, FulfillmentMethod } from "@/shared/order-fulfillment";
import type { ProductVariant } from "@/shared/product-variants";
import { normalizeProductImageUrls } from "@/shared/product-images";
import { canCustomerSignIn } from "@/shared/account-approval";
import { ADMIN_CONFIG, STORE_CONFIG } from "@/config/app-config";

export type Product = { id: string; name: string; category: string; price: number; mrp?: number; unit: string; stock: number; icon: string; imageUrl?: string; imageUrls?: string[]; featured?: boolean; variants?: ProductVariant[]; barcode?: string; description?: string };
export type CartLine = { productId: string; quantity: number; productName?: string; unit?: string; unitPrice?: number; variantId?: string };
export type FestivalBasketItem = CartLine & { reason?: string };
export type FestivalBasket = { id: string; title: string; occasion: string; description: string; items: FestivalBasketItem[]; published: boolean; updatedAt: string };
export type PaymentMethod = CheckoutPaymentMethod;
export type OrderFulfillment = FulfillmentMethod;
export type OrderStatus = "New" | "Packed" | "Out for delivery" | "Delivered" | "Cancelled" | "Payment pending";
export type CustomerProfile = { name: string; phone: string; email?: string; address: string; location?: GeoCoordinate };
export type Order = { id: string; customerId?: string; items: CartLine[]; customer: CustomerProfile; payment: PaymentMethod; fulfillment?: OrderFulfillment; status: OrderStatus; total: number; createdAt: string; confirmedAt?: string; note?: string; originalTotal?: number; unavailableItems?: UnavailableOrderItem[]; audioUri?: string };
export type CreditVerification = CreditVerificationDraft & { submittedAt: string };
export type CreditAccount = { status: "none" | "requested" | "approved" | "declined"; limit: number; used: number; enabled?: boolean; requestedLimit?: number; dueDate?: string; verification?: CreditVerification };
export type StoreSettings = { storeName: string; phone: string; whatsapp: string; upiId: string; upiEnabled?: boolean; nivCreditEnabled?: boolean; deliveryRadius: string; openingTime: string; closingTime: string; hours: string; isOpen?: boolean; storeLocation?: GeoCoordinate; featuredProductIds?: string[]; featuredProductDiscounts?: Record<string, number>; catalogCategories?: string[] };
export type LocalAccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type LocalCustomerAccount = { id: string; customer: CustomerProfile; cart: CartLine[]; orders: Order[]; credit: CreditAccount; createdAt: string; lastSignedInAt: string; status?: LocalAccountStatus; role?: "customer" | "admin"; approvalRequestedAt?: string; approvedAt?: string; rejectionReason?: string };

type PersistedStore = { products: Product[]; cart: CartLine[]; orders: Order[]; historicalOrders?: Order[]; festivalBasket: FestivalBasket | null; customer: CustomerProfile; credit: CreditAccount; settings: StoreSettings; accounts: LocalCustomerAccount[]; activeAccountId: string | null };
type NivStoreValue = PersistedStore & { hydrated: boolean; activeAccount: LocalCustomerAccount | null; ownerOrders: OwnerOrder[]; isSignedIn: boolean; ownerMode: boolean; syncAllDataFromCloud: () => Promise<void>; enterOwnerMode: () => void; exitOwnerMode: () => void; approveCustomerAccount: (accountId: string) => void; rejectCustomerAccount: (accountId: string, reason?: string) => void; deleteCustomerAccount: (accountId: string) => void; setCustomerAccountSuspended: (accountId: string, suspended: boolean) => void; setCustomerAccountRole: (accountId: string, role: "customer" | "admin") => void; addToCart: (productId: string, quantity?: number, unitPrice?: number, variantId?: string, unit?: string) => void; changeQuantity: (productId: string, delta: number, variantId?: string) => void; removeFromCart: (productId: string, variantId?: string) => void; cartTotal: number; cartCount: number; createOrder: (payment: PaymentMethod, note?: string, deliveryCustomer?: CustomerProfile, fulfillment?: OrderFulfillment) => Order | null; addVoiceOrder: (audioUri: string) => Order | null; updateOrderStatus: (orderId: string, status: OrderStatus) => void; updateOwnerOrderStatus: (accountId: string, orderId: string, status: OrderStatus) => void; confirmOwnerOrder: (accountId: string, orderId: string) => void; updateOwnerOrderItems: (accountId: string, orderId: string, items: CartLine[], unavailableItems?: UnavailableOrderItem[]) => void; updateOwnerOrderTotal: (accountId: string, orderId: string, total: number) => void; deleteOwnerOrder: (accountId: string, orderId: string) => void; updateCustomer: (next: CustomerProfile) => void; requestCredit: (amount: number) => void; submitCreditVerification: (verification: CreditVerificationDraft) => void; approveCredit: (limit: number, dueDate: string) => void; declineCredit: () => void; approveOwnerCredit: (accountId: string, limit: number, dueDate: string) => void; declineOwnerCredit: (accountId: string) => void; deleteOwnerCredit: (accountId: string) => void; setOwnerCreditEnabled: (accountId: string, enabled: boolean) => void; resetOwnerCreditUsed: (accountId: string) => void; setOwnerCreditLimit: (accountId: string, limit: number) => void; cancelOwnerCreditRequest: (accountId: string) => void; addProduct: (product: Omit<Product, "id">) => void; updateProduct: (id: string, next: Partial<Product>) => void; removeProduct: (id: string) => void; updateSettings: (next: Partial<StoreSettings>) => void; saveFestivalBasket: (basket: FestivalBasket | null) => void; getProduct: (productId: string) => Product | undefined; signInWithPhone: (phone: string) => boolean; signInWithCustomerProfile: (profile: { id: string; name: string; phone: string; email?: string | null; address?: string; status?: string }) => void; createLocalAccount: (customer: CustomerProfile) => "pending" | "created" | "exists"; signOut: () => void };


const STORE_KEY = "niv-kirana-store-v2";
const LEGACY_STORE_KEYS = ["niv-kirana-store-v1", "niv-kirana-store"];
const emptyCustomer: CustomerProfile = { name: "", phone: "", address: "" };
const emptyCredit: CreditAccount = { status: "none", limit: 0, used: 0, enabled: false };
const defaultCredit: CreditAccount = {
  status: "none",
  limit: 0,
  used: 0,
  enabled: false,
};
const seedProducts: Product[] = [{ id: "atta", name: "Aashirvaad Atta", category: "Staples", price: 285, unit: "5 kg", stock: 24, icon: "🌾", featured: true }, { id: "rice", name: "Premium Rice", category: "Staples", price: 325, unit: "5 kg", stock: 18, icon: "🍚", featured: true }, { id: "toor-dal", name: "Toor Dal", category: "Pulses", price: 168, unit: "1 kg", stock: 9, icon: "🫘" }, { id: "sugar", name: "Sugar", category: "Staples", price: 49, unit: "1 kg", stock: 36, icon: "🧂" }, { id: "milk", name: "Fresh Milk", category: "Dairy", price: 34, unit: "500 ml", stock: 28, icon: "🥛", featured: true }, { id: "tea", name: "Daily Tea", category: "Beverages", price: 145, unit: "250 g", stock: 16, icon: "🍵" }, { id: "biscuits", name: "Marie Biscuits", category: "Snacks", price: 32, unit: "pack", stock: 41, icon: "🍪" }, { id: "surf", name: "Laundry Powder", category: "Home care", price: 125, unit: "1 kg", stock: 5, icon: "🧺" }, { id: "soap", name: "Bath Soap", category: "Personal care", price: 38, unit: "125 g", stock: 21, icon: "🧼" }, { id: "potato", name: "Farm Potatoes", category: "Fresh", price: 35, unit: "1 kg", stock: 14, icon: "🥔" }];
const defaultStore: PersistedStore = {
  products: seedProducts,
  cart: [],
  orders: [],
  historicalOrders: [],
  festivalBasket: {
    id: "diwali-starter",
    title: "Diwali Chai & Snack Basket",
    occasion: "Diwali",
    description: "AI ने NIV Kirana के available essentials से festive chai-time basket तैयार किया है। आप items और quantity बदल सकते हैं।",
    items: [
      { productId: "tea", quantity: 1, reason: "Festival chai time" },
      { productId: "sugar", quantity: 1, reason: "Mithai और chai essential" },
      { productId: "biscuits", quantity: 2, reason: "Guest snack" },
      { productId: "milk", quantity: 2, reason: "Chai preparation" },
    ],
    published: true,
    updatedAt: "Today",
  },
  customer: emptyCustomer,
  credit: defaultCredit,
  settings: {
    storeName: STORE_CONFIG.name,
    phone: STORE_CONFIG.phone,
    whatsapp: STORE_CONFIG.whatsapp,
    upiId: STORE_CONFIG.upiId,
    upiEnabled: STORE_CONFIG.upiEnabled,
    nivCreditEnabled: STORE_CONFIG.nivCreditEnabled,
    deliveryRadius: STORE_CONFIG.deliveryRadius,
    openingTime: STORE_CONFIG.openingTime,
    closingTime: STORE_CONFIG.closingTime,
    hours: STORE_CONFIG.hours,
    isOpen: true,
    featuredProductIds: seedProducts.filter((product) => product.featured).map((product) => product.id),
    featuredProductDiscounts: {},
    catalogCategories: [...DEFAULT_CATALOG_CATEGORIES],
  },
  accounts: [],
  activeAccountId: null,
};

const NivStoreContext = createContext<NivStoreValue | undefined>(undefined);

function syncActiveAccount(current: PersistedStore, next: PersistedStore): PersistedStore {
  if (!current.activeAccountId) return next;
  return { ...next, accounts: current.accounts.map((account) => account.id === current.activeAccountId ? { ...account, customer: next.customer, cart: next.cart, orders: next.orders, credit: next.credit } : account) };
}

function migrateOrderDates(orders: Order[], fallbackTimestamp: string) {
  return orders.map((order) => ({ ...order, createdAt: normalizeOrderTimestamp(order.createdAt, fallbackTimestamp) }));
}

function updateCreditForAccount(current: PersistedStore, accountId: string, transform: (credit: CreditAccount) => CreditAccount): PersistedStore {
  let nextCredit: CreditAccount | undefined;
  const accounts = current.accounts.map((account) => {
    if (account.id !== accountId) return account;
    nextCredit = transform(normalizeCreditAccount(account.credit));
    return { ...account, credit: nextCredit };
  });
  return { ...current, accounts, credit: current.activeAccountId === accountId && nextCredit ? nextCredit : current.credit };
}

function restoreStore(saved: Partial<PersistedStore>): PersistedStore {
  const rawCustomer = saved.customer ?? emptyCustomer;
  const legacyCustomer = rawCustomer;

  const savedAccounts = Array.isArray(saved.accounts) ? saved.accounts : [];
  const accounts = savedAccounts
    .filter((account) => {
      if (!account || !account.id) return false;
      const email = account.customer?.email?.toLowerCase();
      if (email === ADMIN_CONFIG.defaultOwnerEmail) return false;
      return true;
    })
    .map((account) => ({
      ...account,
      id: account.id || `customer-${normalizeIndianMobile(account.customer?.phone ?? "")}`,
      customer: { ...emptyCustomer, ...account.customer, phone: normalizeIndianMobile(account.customer?.phone ?? "") },
      cart: account.cart ?? [],
      orders: account.orders ?? [],
      credit: (account.credit && account.credit.status === "approved" && account.credit.limit > 0) ? account.credit : defaultCredit,
      status: account.status ?? "approved",
      role: account.role ?? "customer",
      approvalRequestedAt: account.approvalRequestedAt ?? account.createdAt ?? new Date().toISOString(),
    }));
  const legacyPhone = normalizeIndianMobile(legacyCustomer.phone);
  let recoveredLegacyAccountId: string | null = null;
  if (legacyPhone && shouldRecoverLegacyLocalAccount(accounts.map((account) => account.customer.phone), legacyPhone)) {
    recoveredLegacyAccountId = `customer-${legacyPhone}`;
    accounts.push({
      id: recoveredLegacyAccountId,
      customer: { ...emptyCustomer, ...legacyCustomer, phone: legacyPhone },
      cart: saved.cart ?? [],
      orders: saved.orders ?? [],
      credit: defaultCredit,
      createdAt: new Date().toISOString(),
      lastSignedInAt: new Date().toISOString(),
      status: "approved",
      role: "customer",
      approvalRequestedAt: new Date().toISOString(),
    });
  }
  const restoredSettings = {
    ...defaultStore.settings,
    ...saved.settings,
    catalogCategories: usableCatalogCategories(saved.settings?.catalogCategories ?? defaultStore.settings.catalogCategories),
  };
  if (!restoredSettings.phone || restoredSettings.phone.includes("9876543210")) {
    restoredSettings.phone = STORE_CONFIG.phone;
  }
  if (!restoredSettings.whatsapp || restoredSettings.whatsapp.includes("9876543210")) {
    restoredSettings.whatsapp = STORE_CONFIG.whatsapp;
  }
  const restored = { ...defaultStore, ...saved, customer: { ...emptyCustomer, ...legacyCustomer, phone: legacyPhone || legacyCustomer.phone }, accounts, settings: restoredSettings } as PersistedStore;
  const fallbackTimestamp = new Date().toISOString();
  restored.accounts = restored.accounts.map((account) => {
    let cleanCredit = normalizeCreditAccount(account.credit);
    if (cleanCredit.limit === 5000 || cleanCredit.status === "none" || !cleanCredit.enabled) {
      cleanCredit = { status: "none", limit: 0, used: 0, enabled: false };
    }
    return {
      ...account,
      credit: cleanCredit,
      orders: migrateOrderDates(account.orders ?? [], fallbackTimestamp),
    };
  });
  if (restored.credit.limit === 5000 || restored.credit.status === "none" || !restored.credit.enabled) {
    restored.credit = defaultCredit;
  }
  if (recoveredLegacyAccountId && !restored.activeAccountId) {
    const recoveredAccount = restored.accounts.find((account) => account.id === recoveredLegacyAccountId);
    if (recoveredAccount) {
      restored.activeAccountId = recoveredAccount.id;
      restored.customer = recoveredAccount.customer;
      restored.cart = recoveredAccount.cart;
      restored.orders = recoveredAccount.orders;
      restored.credit = recoveredAccount.credit;
    }
  }
  if (!restored.activeAccountId || !restored.accounts.some((account) => account.id === restored.activeAccountId)) restored.activeAccountId = null;
  if (restored.activeAccountId === "customer-9876543210" || restored.activeAccountId === "customer-8433055349") {
    restored.activeAccountId = null;
    restored.customer = emptyCustomer;
  }
  if (restored.products.length === 0) restored.products = seedProducts;
  restored.products = restored.products.map((product) => ({ ...product, imageUrls: normalizeProductImageUrls(product.imageUrls, product.imageUrl), imageUrl: product.imageUrl ?? normalizeProductImageUrls(product.imageUrls)[0] }));
  return restored;
}

export function NivStoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PersistedStore>(defaultStore);
  const [hydrated, setHydrated] = useState(false);
  const [ownerMode, setOwnerMode] = useState(false);
  useEffect(() => {
    void (async () => {
      try {
        const storedKey = [STORE_KEY, ...LEGACY_STORE_KEYS];
        let restored = defaultStore;
        for (const key of storedKey) {
          const raw = await AsyncStorage.getItem(key);
          if (raw) {
            restored = restoreStore(JSON.parse(raw) as Partial<PersistedStore>);
            break;
          }
        }
        const legacyVoiceOrders = await readVoiceOrders();
        if (legacyVoiceOrders.length) {
          const accounts = mergeLegacyVoiceOrders(restored.accounts, legacyVoiceOrders);
          const activeAccount = accounts.find((account) => account.id === restored.activeAccountId);
          restored = { ...restored, accounts, customer: activeAccount?.customer ?? restored.customer, cart: activeAccount?.cart ?? restored.cart, orders: activeAccount?.orders ?? restored.orders, credit: activeAccount?.credit ?? restored.credit };
          await clearVoiceOrders();
        }
        const storedOwnerMode = await AsyncStorage.getItem("niv_owner_mode");
        if (storedOwnerMode === "true") {
          setOwnerMode(true);
        }
        setStore(restored);
        setHydrated(true);

        // Background fetch from Supabase (non-blocking)
        try {
          const { fetchProductsFromDb, fetchStoreSettingsFromDb, fetchFestivalBasketFromDb } = await import("@/lib/supabase-service");
          const [cloudProducts, cloudSettings, cloudBasket] = await Promise.all([
            fetchProductsFromDb(),
            fetchStoreSettingsFromDb(),
            fetchFestivalBasketFromDb(),
          ]);
          setStore((curr) => {
            const nextProd = cloudProducts && cloudProducts.length > 0 ? cloudProducts : curr.products;
            const nextSet = cloudSettings ? { ...curr.settings, ...cloudSettings } : curr.settings;
            const nextBas = cloudBasket ? cloudBasket : curr.festivalBasket;
            return { ...curr, products: nextProd, settings: nextSet, festivalBasket: nextBas };
          });
        } catch (e) {
          console.warn("Supabase fetch error (using cached):", e);
        }
      } catch (err) {
        console.warn("Hydration restore error:", err);
        setHydrated(true);
      }
    })();
  }, []);

  const syncAllDataFromCloud = useCallback(async () => {
    try {
      const { fetchFullAdminData } = await import("@/lib/supabase-service");
      const { profiles, orders, products, settings, creditAccounts, festivalBasket } = await fetchFullAdminData();

      setStore((current) => {
        const nextProducts = products && products.length > 0 ? products : current.products;
        const nextSettings = settings ? { ...current.settings, ...settings } : current.settings;
        const nextFestivalBasket = festivalBasket !== undefined ? festivalBasket : current.festivalBasket;

        const accountMap = new Map<string, LocalCustomerAccount>();
        for (const acc of current.accounts) {
          if (!acc || !acc.id) continue;
          const email = acc.customer?.email?.toLowerCase();
          if (email === ADMIN_CONFIG.defaultOwnerEmail) continue;
          accountMap.set(acc.id, { ...acc });
        }

        for (const prof of profiles) {
          if (prof.email?.toLowerCase() === ADMIN_CONFIG.defaultOwnerEmail || prof.name?.toLowerCase() === "niv store owner") continue;
          const existing = accountMap.get(prof.id) || (prof.phone ? Array.from(accountMap.values()).find((a) => normalizeIndianMobile(a.customer.phone) === normalizeIndianMobile(prof.phone)) : undefined);

          const matchingCredit = creditAccounts.find((c) => c.customer_id === prof.id);
          const hasVerification = Boolean(
            (matchingCredit as any)?.document_url ||
            (matchingCredit as any)?.back_document_url ||
            (matchingCredit as any)?.masked_id_last_four
          );
          const credit: CreditAccount = matchingCredit
            ? {
                status: matchingCredit.status,
                limit: Number(matchingCredit.limit_amount) || 0,
                used: Number(matchingCredit.used_amount) || 0,
                enabled: matchingCredit.enabled && Number(matchingCredit.limit_amount) > 0,
                requestedLimit: matchingCredit.requested_limit ? Number(matchingCredit.requested_limit) : undefined,
                dueDate: matchingCredit.due_date || undefined,
                verification: hasVerification
                  ? {
                      requestedLimit: matchingCredit.requested_limit ? Number(matchingCredit.requested_limit) : 2000,
                      phone: prof.phone || "",
                      maskedIdLastFour: (matchingCredit as any).masked_id_last_four || "",
                      frontDocumentUrl: (matchingCredit as any).document_url || "",
                      backDocumentUrl: (matchingCredit as any).back_document_url || "",
                      latitude: Number((matchingCredit as any).location_lat) || 0,
                      longitude: Number((matchingCredit as any).location_lng) || 0,
                      address: prof.address || undefined,
                      locationCapturedAt: (matchingCredit as any).submitted_at || (matchingCredit as any).updated_at || new Date().toISOString(),
                      consentedAt: (matchingCredit as any).submitted_at || (matchingCredit as any).updated_at || new Date().toISOString(),
                      submittedAt: (matchingCredit as any).submitted_at || (matchingCredit as any).updated_at || new Date().toISOString(),
                    }
                  : existing?.credit?.verification,
              }
            : defaultCredit;

          accountMap.set(prof.id, {
            id: prof.id,
            customer: {
              name: prof.name || existing?.customer.name || "",
              phone: prof.phone || existing?.customer.phone || "",
              email: prof.email || existing?.customer.email || undefined,
              address: prof.address || existing?.customer.address || "",
              location: prof.location_lat && prof.location_lng ? { latitude: prof.location_lat, longitude: prof.location_lng } : existing?.customer.location,
            },
            cart: existing?.cart ?? [],
            orders: existing?.orders ?? [],
            credit,
            createdAt: prof.created_at || existing?.createdAt || new Date().toISOString(),
            lastSignedInAt: existing?.lastSignedInAt || new Date().toISOString(),
            status: (prof.status as any) || "pending",
            role: (prof.role as any) || "customer",
            approvalRequestedAt: prof.approval_requested_at || undefined,
            approvedAt: prof.approved_at || undefined,
            rejectionReason: prof.rejection_reason || undefined,
          });
        }

        const extraHistoricalOrders: Order[] = [...(current.historicalOrders ?? [])];
        for (const ord of orders) {
          const phone = ord.customer.phone ? normalizeIndianMobile(ord.customer.phone) : "";
          let matchedAcc: LocalCustomerAccount | undefined;
          if (ord.customerId && accountMap.has(ord.customerId)) {
            matchedAcc = accountMap.get(ord.customerId);
          } else if (phone) {
            matchedAcc = Array.from(accountMap.values()).find(
              (a) => a.customer.phone && normalizeIndianMobile(a.customer.phone) === phone
            );
          }

          if (matchedAcc) {
            if (!matchedAcc.orders.some((o) => o.id === ord.id)) {
              matchedAcc.orders = [ord, ...matchedAcc.orders];
            } else {
              matchedAcc.orders = matchedAcc.orders.map((o) => (o.id === ord.id ? ord : o));
            }
          } else {
            // Preserving order from deleted/unlinked customer so historical sales never disappear
            const existingIdx = extraHistoricalOrders.findIndex((o) => o.id === ord.id);
            if (existingIdx === -1) {
              extraHistoricalOrders.push(ord);
            } else {
              extraHistoricalOrders[existingIdx] = ord;
            }
          }
        }

        const nextAccounts = Array.from(accountMap.values());
        const activeAcc =
          nextAccounts.find(
            (a) =>
              a.id === current.activeAccountId ||
              (current.customer?.phone &&
                normalizeIndianMobile(a.customer.phone) === normalizeIndianMobile(current.customer.phone))
          ) ?? null;
        const nextCustomer = activeAcc ? activeAcc.customer : current.customer;
        const nextOrders = activeAcc ? activeAcc.orders : current.orders;
        const nextCredit = activeAcc ? activeAcc.credit : current.credit;

        if (
          JSON.stringify(current.products) === JSON.stringify(nextProducts) &&
          JSON.stringify(current.settings) === JSON.stringify(nextSettings) &&
          JSON.stringify(current.festivalBasket) === JSON.stringify(nextFestivalBasket) &&
          JSON.stringify(current.accounts) === JSON.stringify(nextAccounts) &&
          JSON.stringify(current.historicalOrders ?? []) === JSON.stringify(extraHistoricalOrders) &&
          JSON.stringify(current.customer) === JSON.stringify(nextCustomer) &&
          JSON.stringify(current.orders) === JSON.stringify(nextOrders) &&
          JSON.stringify(current.credit) === JSON.stringify(nextCredit)
        ) {
          return current;
        }

        return {
          ...current,
          products: nextProducts,
          settings: nextSettings,
          festivalBasket: nextFestivalBasket,
          accounts: nextAccounts,
          customer: nextCustomer,
          orders: nextOrders,
          credit: nextCredit,
          historicalOrders: extraHistoricalOrders,
        };
      });
    } catch (e) {
      console.warn("Cloud sync error:", e);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    void syncAllDataFromCloud();

    const interval = setInterval(() => {
      void syncAllDataFromCloud();
    }, 10000);

    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void syncAllDataFromCloud();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [hydrated, syncAllDataFromCloud]);

  useEffect(() => { if (hydrated) void AsyncStorage.setItem(STORE_KEY, JSON.stringify(store)); }, [hydrated, store]);
  const getProduct = (productId: string) => store.products.find((item) => item.id === productId);
  const cartTotal = store.cart.reduce((sum, line) => sum + (line.unitPrice ?? getProduct(line.productId)?.price ?? 0) * line.quantity, 0);
  const cartCount = store.cart.reduce((sum, line) => sum + line.quantity, 0);
  const activeAccount = store.accounts.find((account) => account.id === store.activeAccountId) ?? null;
  const ownerOrders = collectOwnerOrders(store.accounts, store.historicalOrders);

  const value = useMemo<NivStoreValue>(() => ({ ...store, hydrated, activeAccount, ownerOrders, isSignedIn: Boolean(activeAccount), ownerMode, syncAllDataFromCloud,
    enterOwnerMode() {
      setOwnerMode(true);
      void AsyncStorage.setItem("niv_owner_mode", "true");
    },
    exitOwnerMode() {
      setOwnerMode(false);
      void AsyncStorage.removeItem("niv_owner_mode");
    },
    cartTotal, cartCount, getProduct,
    signInWithPhone(phone) { const mobile = normalizeIndianMobile(phone); const account = store.accounts.find((item) => normalizeIndianMobile(item.customer.phone) === mobile && canCustomerSignIn(item.status)); if (!account) return false; setStore((current) => ({ ...current, activeAccountId: account.id, customer: account.customer, cart: account.cart, orders: account.orders, credit: account.credit, accounts: current.accounts.map((item) => item.id === account.id ? { ...item, lastSignedInAt: new Date().toISOString() } : item) })); return true; },
    signInWithCustomerProfile(profile) {
      const phone = normalizeIndianMobile(profile.phone || "");
      const accountId = profile.id;
      setStore((current) => {
        const existing = current.accounts.find((a) => a.id === accountId || (phone && normalizeIndianMobile(a.customer.phone) === phone));
        const customer: CustomerProfile = {
          name: profile.name,
          phone,
          email: profile.email || undefined,
          address: profile.address || existing?.customer.address || "",
        };
        const now = new Date().toISOString();
        const updatedAccount: LocalCustomerAccount = {
          id: accountId,
          customer,
          cart: existing?.cart ?? [],
          orders: existing?.orders ?? [],
          credit: existing?.credit ?? defaultCredit,
          createdAt: existing?.createdAt ?? now,
          lastSignedInAt: now,
          status: (profile.status as any) || "approved",
        };
        const nextAccounts = existing
          ? current.accounts.map((a) => (a.id === existing.id ? updatedAccount : a))
          : [...current.accounts, updatedAccount];
        return {
          ...current,
          accounts: nextAccounts,
          activeAccountId: accountId,
          customer,
          cart: updatedAccount.cart,
          orders: updatedAccount.orders,
          credit: updatedAccount.credit,
        };
      });
      void syncAllDataFromCloud();
    },
    createLocalAccount(customer) {
      const phone = normalizeIndianMobile(customer.phone);
      if (store.accounts.some((account) => normalizeIndianMobile(account.customer.phone) === phone)) return "exists";
      const requestedAt = new Date().toISOString();
      const accountId = `customer-${phone || Date.now()}`;
      const account: LocalCustomerAccount = { id: accountId, customer: { ...customer, phone }, cart: [], orders: [], credit: defaultCredit, createdAt: requestedAt, lastSignedInAt: requestedAt, status: "pending", approvalRequestedAt: requestedAt };
      setStore((current) => ({ ...current, accounts: [...current.accounts, account] }));
      void import("@/lib/supabase-service").then(({ upsertCustomerProfileInDb }) => {
        upsertCustomerProfileInDb({
          id: accountId,
          name: customer.name,
          phone,
          address: customer.address,
          location: customer.location,
          status: "pending",
          approvalRequestedAt: requestedAt,
        });
      }).catch(() => {});
      return "pending";
    },
    signOut() {
      setOwnerMode(false);
      void AsyncStorage.removeItem("niv_owner_mode");
      setStore((current) => ({ ...current, activeAccountId: null, customer: emptyCustomer, cart: [], orders: [], credit: defaultCredit }));
    },
    approveCustomerAccount(accountId) {
      setStore((current) => ({ ...current, accounts: current.accounts.map((account) => account.id === accountId ? { ...account, status: "approved", approvedAt: new Date().toISOString(), rejectionReason: undefined } : account) }));
      void import("@/lib/supabase-service").then(({ approveCustomerInDb }) => approveCustomerInDb(accountId)).catch(() => {});
    },
    rejectCustomerAccount(accountId, reason = "Owner ने request approve नहीं की।") {
      setStore((current) => ({ ...current, accounts: current.accounts.map((account) => account.id === accountId ? { ...account, status: "rejected", rejectionReason: reason } : account) }));
      void import("@/lib/supabase-service").then(({ rejectCustomerInDb }) => rejectCustomerInDb(accountId, reason)).catch(() => {});
    },
    deleteCustomerAccount(accountId) {
      setStore((current) => {
        const target = current.accounts.find((a) => a.id === accountId);
        const targetPhone = target?.customer?.phone ? normalizeIndianMobile(target.customer.phone) : "";
        const targetEmail = target?.customer?.email?.trim().toLowerCase() || "";
        const isCurrentActive =
          current.activeAccountId === accountId ||
          (targetPhone && current.customer?.phone && normalizeIndianMobile(current.customer.phone) === targetPhone) ||
          (targetEmail && current.customer?.email && current.customer.email.trim().toLowerCase() === targetEmail);

        // Retain and archive the customer's orders into historicalOrders so all sales remain intact
        const customerOrders = target?.orders ?? [];
        const currentHist = current.historicalOrders ?? [];
        const histIds = new Set(currentHist.map((o) => o.id));
        const newOrdersToArchive = customerOrders
          .map((o) => {
            if (o.status !== "Delivered" && o.status !== "Cancelled") {
              return { ...o, status: "Cancelled" as const };
            }
            return o;
          })
          .filter((o) => !histIds.has(o.id));
        const nextHistoricalOrders = [...currentHist, ...newOrdersToArchive];

        for (const o of customerOrders) {
          if (o.status !== "Delivered" && o.status !== "Cancelled") {
            void import("@/lib/supabase-service").then(({ updateOrderStatusInDb }) => {
              updateOrderStatusInDb(o.id, "Cancelled");
            }).catch(() => {});
          }
        }

        void import("@/lib/supabase-service").then(({ deleteCustomerFromDb }) => {
          deleteCustomerFromDb({ id: accountId, phone: targetPhone, email: targetEmail });
        }).catch(() => {});

        return {
          ...current,
          accounts: current.accounts.filter(
            (account) =>
              account.id !== accountId &&
              (!targetPhone || normalizeIndianMobile(account.customer?.phone) !== targetPhone) &&
              (!targetEmail || account.customer?.email?.trim().toLowerCase() !== targetEmail)
          ),
          activeAccountId: isCurrentActive ? null : current.activeAccountId,
          customer: isCurrentActive ? emptyCustomer : current.customer,
          cart: isCurrentActive ? [] : current.cart,
          orders: isCurrentActive
            ? []
            : current.orders.filter(
                (order) =>
                  order.customerId !== accountId &&
                  (!targetPhone || normalizeIndianMobile(order.customer?.phone) !== targetPhone)
              ),
          credit: isCurrentActive ? emptyCredit : current.credit,
          historicalOrders: nextHistoricalOrders,
        };
      });
    },
    setCustomerAccountSuspended(accountId, suspended) {
      setStore((current) => ({
        ...current,
        accounts: current.accounts.map((account) =>
          account.id === accountId ? { ...account, status: suspended ? "suspended" : "approved" } : account
        ),
      }));
      void import("@/lib/supabase-service").then(({ setCustomerStatusInDb }) => {
        setCustomerStatusInDb(accountId, suspended ? "suspended" : "approved");
      }).catch(() => {});
    },
    setCustomerAccountRole(accountId, role) {
      setStore((current) => ({
        ...current,
        accounts: current.accounts.map((account) =>
          account.id === accountId ? { ...account, role } : account
        ),
      }));
      void import("@/lib/supabase-service").then(({ setCustomerRoleInDb }) => {
        setCustomerRoleInDb(accountId, role);
      }).catch(() => {});
    },
    addToCart(productId, quantity = 1, unitPrice, variantId, unit) {
      setStore((current) => {
        const product = current.products.find((item) => item.id === productId);
        if (!product || (product.stock ?? 0) <= 0) return current;
        const requested = quantityForCart(quantity, product.stock);
        if (requested <= 0) return current;
        const effectiveUnitPrice = Number.isFinite(unitPrice) && (unitPrice ?? 0) >= 0 ? unitPrice : product.price;
        const lineUnit = unit ?? product.unit;
        const existing = current.cart.find((line) => line.productId === productId && line.variantId === variantId);
        if (existing && existing.quantity >= product.stock) {
          return current;
        }
        const cart = existing
          ? current.cart.map((line) => {
              if (line.productId !== productId || line.variantId !== variantId) return line;
              return { ...line, quantity: Math.min(line.quantity + requested, product.stock), productName: product.name, unit: lineUnit, unitPrice: effectiveUnitPrice };
            })
          : [...current.cart, { productId, quantity: Math.min(requested, product.stock), productName: product.name, unit: lineUnit, unitPrice: effectiveUnitPrice, variantId }];
        return syncActiveAccount(current, { ...current, cart });
      });
    },
    changeQuantity(productId, delta, variantId) {
      setStore((current) => {
        const product = current.products.find((item) => item.id === productId);
        if (!product) return current;
        const maxStock = Math.max(0, product.stock ?? 0);
        const cart = current.cart
          .map((line) => {
            if (line.productId !== productId || line.variantId !== variantId) return line;
            return { ...line, quantity: Math.max(0, Math.min(line.quantity + delta, maxStock)) };
          })
          .filter((line) => line.quantity > 0);
        return syncActiveAccount(current, { ...current, cart });
      });
    },
    removeFromCart(productId, variantId) { setStore((current) => syncActiveAccount(current, { ...current, cart: current.cart.filter((line) => !(line.productId === productId && line.variantId === variantId)) })); },
    createOrder(payment, note, deliveryCustomer, fulfillment = "Delivery") {
      if (store.cart.length === 0 || !store.activeAccountId) return null;

      // Strict stock verification: Every cart item MUST have available stock
      for (const line of store.cart) {
        const prod = getProduct(line.productId);
        if (!prod || (prod.stock ?? 0) <= 0 || line.quantity > (prod.stock ?? 0)) {
          return null;
        }
      }

      if (payment === "NIV Credit") {
        const available = Math.max(0, store.credit.limit - store.credit.used);
        if (store.credit.status !== "approved" || store.credit.enabled === false || store.credit.limit <= 0 || cartTotal > available) {
          return null;
        }
      }
      const orderItems = store.cart.map((line) => { const product = getProduct(line.productId); return { ...line, productName: product?.name, unit: line.unit ?? product?.unit, unitPrice: line.unitPrice ?? product?.price }; });
      const order: Order = { id: `NIV-${Math.floor(1000 + Math.random() * 8999)}`, items: orderItems, customer: deliveryCustomer ?? store.customer, payment, fulfillment, status: payment === "UPI" ? "Payment pending" : "New", total: cartTotal, createdAt: new Date().toISOString(), note };
      setStore((current) => {
        const products = current.products.map((product) => { const quantity = current.cart.find((line) => line.productId === product.id)?.quantity ?? 0; return quantity ? { ...product, stock: Math.max(0, product.stock - quantity) } : product; });
        const credit = payment === "NIV Credit" ? { ...current.credit, used: current.credit.used + order.total } : current.credit;
        return syncActiveAccount(current, { ...current, cart: [], orders: [order, ...current.orders], products, credit });
      });
      void import("@/lib/supabase-service").then(({ createOrderInDb, upsertCreditAccountInDb, updateProductInDb }) => {
        void createOrderInDb({ id: order.id, customerId: store.activeAccountId || undefined, customer: deliveryCustomer ?? store.customer, items: orderItems, total: cartTotal, payment, fulfillment, note }).catch((e) => console.warn("createOrderInDb error:", e));
        store.cart.forEach((line) => {
          const prod = getProduct(line.productId);
          if (prod) {
            const nextStock = Math.max(0, (prod.stock ?? 0) - line.quantity);
            void updateProductInDb(prod.id, { stock: nextStock }).catch((e) => console.warn("updateProductInDb stock error:", e));
          }
        });
        if (payment === "NIV Credit" && store.activeAccountId) {
          void upsertCreditAccountInDb({
            customerId: store.activeAccountId,
            status: store.credit.status,
            limitAmount: store.credit.limit,
            usedAmount: store.credit.used + order.total,
            enabled: store.credit.enabled ?? true,
          }).catch((e) => console.warn("upsertCreditAccountInDb error:", e));
        }
      }).catch((e) => console.warn("Supabase order error:", e));
      return order;
    },
    addVoiceOrder(audioUri) {
      if (!audioUri.trim() || !store.activeAccountId) return null;
      const order: Order = { id: `NIV-VOICE-${Date.now()}`, items: [], customer: store.customer, payment: "Cash on delivery", fulfillment: "Delivery", status: "New", total: 0, createdAt: new Date().toISOString(), audioUri, note: "Voice Order — recording सुनकर items और bill confirm करें।" };
      setStore((current) => syncActiveAccount(current, { ...current, orders: [order, ...current.orders] }));
      void import("@/lib/supabase-service").then(({ createOrderInDb }) => {
        createOrderInDb({
          id: order.id,
          customerId: store.activeAccountId || undefined,
          customer: store.customer,
          items: [],
          total: 0,
          payment: "Cash on delivery",
          fulfillment: "Delivery",
          note: order.note,
          audioUrl: audioUri,
        });
      }).catch((e) => console.warn("Supabase voice order error:", e));
      return order;
    },
    updateOrderStatus(orderId, status) {
      setStore((current) => {
        let refundCredit = 0;
        const targetOrder = current.orders.find((o) => o.id === orderId);
        if (targetOrder && targetOrder.status !== "Cancelled" && status === "Cancelled" && targetOrder.payment === "NIV Credit") {
          refundCredit = targetOrder.total || 0;
        }
        const nextCredit = refundCredit > 0 ? { ...current.credit, used: Math.max(0, current.credit.used - refundCredit) } : current.credit;
        return syncActiveAccount(current, { ...current, orders: current.orders.map((order) => order.id === orderId ? { ...order, status } : order), credit: nextCredit });
      });
      void import("@/lib/supabase-service").then(({ updateOrderStatusInDb }) => updateOrderStatusInDb(orderId, status)).catch(() => {});
    },
    updateOwnerOrderStatus(accountId, orderId, status) {
      setStore((current) => {
        let refundCredit = 0;
        const accounts = current.accounts.map((account) => {
          if (account.id !== accountId) return account;
          const target = account.orders.find((o) => o.id === orderId);
          if (target && target.status !== "Cancelled" && status === "Cancelled" && target.payment === "NIV Credit") {
            refundCredit = target.total || 0;
          }
          const nextOrders = account.orders.map((o) => o.id === orderId ? { ...o, status } : o);
          const nextCredit = refundCredit > 0 ? { ...account.credit, used: Math.max(0, account.credit.used - refundCredit) } : account.credit;
          return { ...account, orders: nextOrders, credit: nextCredit };
        });
        const activeAccount = accounts.find((account) => account.id === current.activeAccountId);
        const activeOrders = current.activeAccountId === accountId ? activeAccount?.orders ?? current.orders : current.orders;
        const historicalOrders = (current.historicalOrders ?? []).map((o) => o.id === orderId ? { ...o, status } : o);
        return {
          ...current,
          accounts,
          orders: activeOrders,
          credit: current.activeAccountId === accountId ? activeAccount?.credit ?? current.credit : current.credit,
          historicalOrders,
        };
      });
      void import("@/lib/supabase-service").then(({ updateOrderStatusInDb }) => updateOrderStatusInDb(orderId, status)).catch(() => {});
    },
    confirmOwnerOrder(accountId, orderId) {
      setStore((current) => {
        const accounts = confirmAccountOrder(current.accounts, accountId, orderId);
        const activeOrders = current.activeAccountId === accountId ? accounts.find((account) => account.id === accountId)?.orders ?? current.orders : current.orders;
        const historicalOrders = (current.historicalOrders ?? []).map((o) => o.id === orderId ? { ...o, status: "Packed" as const, confirmedAt: o.confirmedAt ?? new Date().toISOString() } : o);
        return { ...current, accounts, orders: activeOrders, historicalOrders };
      });
      void import("@/lib/supabase-service").then(({ confirmOrderInDb }) => confirmOrderInDb(orderId)).catch(() => {});
    },
    updateOwnerOrderItems(accountId, orderId, items, unavailableItems) {
      setStore((current) => {
        const accounts = current.accounts.map((account) => {
          if (account.id !== accountId) return account;
          let previousTotal = 0;
          let nextTotal = 0;
          let revisedPayment: PaymentMethod | undefined;
          const orders = account.orders.map((order) => {
            if (order.id !== orderId) return order;
            const nextUnavailableItems = unavailableItems ?? order.unavailableItems ?? [];
            const total = revisedOrderTotal(items);
            previousTotal = order.total;
            nextTotal = total;
            revisedPayment = order.payment;
            return { ...order, items, total, unavailableItems: nextUnavailableItems, originalTotal: nextUnavailableItems.length ? order.originalTotal ?? order.total : undefined };
          });
          const credit = revisedPayment === "NIV Credit" ? { ...account.credit, used: Math.max(0, account.credit.used - previousTotal + nextTotal) } : account.credit;
          return { ...account, orders, credit };
        });
        const historicalOrders = (current.historicalOrders ?? []).map((order) => {
          if (order.id !== orderId) return order;
          const nextUnavailableItems = unavailableItems ?? order.unavailableItems ?? [];
          const total = revisedOrderTotal(items);
          return { ...order, items, total, unavailableItems: nextUnavailableItems, originalTotal: nextUnavailableItems.length ? order.originalTotal ?? order.total : undefined };
        });
        const activeAccount = accounts.find((account) => account.id === current.activeAccountId);
        return { ...current, accounts, orders: current.activeAccountId === accountId ? activeAccount?.orders ?? current.orders : current.orders, credit: current.activeAccountId === accountId ? activeAccount?.credit ?? current.credit : current.credit, historicalOrders };
      });
      void import("@/lib/supabase-service").then(({ reviseOrderInDb }) => reviseOrderInDb(orderId, items, unavailableItems || [], revisedOrderTotal(items))).catch(() => {});
    },
    updateOwnerOrderTotal(accountId, orderId, total) {
      const cleanTotal = Math.max(0, Number(total) || 0);
      setStore((current) => {
        const accounts = current.accounts.map((account) => {
          const hasOrder = account.orders.some((o) => o.id === orderId);
          if (account.id !== accountId && !hasOrder) return account;
          const nextOrders = account.orders.map((o) => (o.id === orderId ? { ...o, total: cleanTotal } : o));
          return { ...account, orders: nextOrders };
        });
        const activeOrders = current.orders.map((o) => (o.id === orderId ? { ...o, total: cleanTotal } : o));
        const historicalOrders = (current.historicalOrders ?? []).map((o) => (o.id === orderId ? { ...o, total: cleanTotal } : o));
        return { ...current, accounts, orders: activeOrders, historicalOrders };
      });
      void import("@/lib/supabase-service").then(({ updateOrderTotalInDb }) => updateOrderTotalInDb(orderId, cleanTotal)).catch((e) => console.warn("Supabase update total error:", e));
    },
    deleteOwnerOrder(accountId, orderId) {
      setStore((current) => {
        let isDelivered = false;
        for (const account of current.accounts) {
          const ord = account.orders.find((o) => o.id === orderId);
          if (ord?.status === "Delivered") {
            isDelivered = true;
            break;
          }
        }
        if (!isDelivered && current.historicalOrders) {
          const ord = current.historicalOrders.find((o) => o.id === orderId);
          if (ord?.status === "Delivered") {
            isDelivered = true;
          }
        }
        if (isDelivered) {
          console.warn("Delivered orders cannot be deleted as they form permanent sales records.");
          return current;
        }

        let deletedTotal = 0;
        let deletedPayment: PaymentMethod | undefined;
        const accounts = current.accounts.map((account) => {
          if (account.id !== accountId) return account;
          const order = account.orders.find((item) => item.id === orderId);
          if (!order) return account;
          deletedTotal = order.total;
          deletedPayment = order.payment;
          return { ...account, orders: account.orders.filter((item) => item.id !== orderId), credit: deletedPayment === "NIV Credit" ? { ...account.credit, used: Math.max(0, account.credit.used - deletedTotal) } : account.credit };
        });
        const historicalOrders = (current.historicalOrders ?? []).filter((item) => item.id !== orderId);
        const activeAccount = accounts.find((account) => account.id === current.activeAccountId);
        return { ...current, accounts, orders: current.activeAccountId === accountId ? activeAccount?.orders ?? current.orders : current.orders, credit: current.activeAccountId === accountId ? activeAccount?.credit ?? current.credit : current.credit, historicalOrders };
      });
      void import("@/lib/supabase-service").then(({ deleteOrderInDb }) => deleteOrderInDb(orderId)).catch(() => {});
    },

    updateCustomer(customer) {
      setStore((current) => syncActiveAccount(current, { ...current, customer }));
      if (store.activeAccountId) {
        void import("@/lib/supabase-service").then(({ upsertCustomerProfileInDb }) => {
          upsertCustomerProfileInDb({
            id: store.activeAccountId!,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            location: customer.location,
            status: "approved",
          });
        }).catch(() => {});
      }
    },
    requestCredit(amount) {
      setStore((current) => syncActiveAccount(current, { ...current, credit: { ...current.credit, status: "requested", enabled: false, requestedLimit: amount } }));
      if (store.activeAccountId) {
        void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
          upsertCreditAccountInDb({
            customerId: store.activeAccountId!,
            status: "requested",
            limitAmount: 0,
            usedAmount: store.credit.used,
            enabled: false,
            requestedLimit: amount,
          });
        }).catch(() => {});
      }
    },
    submitCreditVerification(verification) {
      setStore((current) => syncActiveAccount(current, { ...current, credit: { ...current.credit, status: "requested", enabled: false, requestedLimit: verification.requestedLimit, verification: { ...verification, submittedAt: new Date().toISOString() } } }));
      if (store.activeAccountId) {
        void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
          upsertCreditAccountInDb({
            customerId: store.activeAccountId!,
            status: "requested",
            limitAmount: 0,
            usedAmount: store.credit.used,
            enabled: false,
            requestedLimit: verification.requestedLimit,
            verification,
          });
        }).catch(() => {});
      }
    },
    approveCredit(limit, dueDate) { setStore((current) => syncActiveAccount(current, { ...current, credit: approvedCredit(limit, current.credit.used, dueDate) })); },
    declineCredit() { setStore((current) => syncActiveAccount(current, { ...current, credit: { ...cancelledCredit(), status: "declined" } })); },
    approveOwnerCredit(accountId, limit, dueDate = "Revolving") {
      setStore((current) => updateCreditForAccount(current, accountId, (credit) => approvedCredit(limit, credit.used, dueDate)));
      void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
        upsertCreditAccountInDb({
          customerId: accountId,
          status: "approved",
          limitAmount: limit,
          usedAmount: 0,
          enabled: true,
          dueDate,
        });
      }).catch(() => {});
    },
    declineOwnerCredit(accountId) {
      setStore((current) => updateCreditForAccount(current, accountId, () => ({ ...cancelledCredit(), status: "declined" })));
      void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
        upsertCreditAccountInDb({
          customerId: accountId,
          status: "declined",
          limitAmount: 0,
          usedAmount: 0,
          enabled: false,
        });
      }).catch(() => {});
    },
    deleteOwnerCredit(accountId) {
      setStore((current) => updateCreditForAccount(current, accountId, () => ({ ...defaultCredit })));
      void import("@/lib/supabase-service").then(({ deleteCreditAccountInDb }) => deleteCreditAccountInDb(accountId)).catch(() => {});
    },
    setOwnerCreditEnabled(accountId, enabled) {
      let targetLimit = 0;
      let targetUsed = 0;
      setStore((current) => {
        const target = current.accounts.find((a) => a.id === accountId);
        targetLimit = target?.credit?.limit || 0;
        targetUsed = target?.credit?.used || 0;
        return updateCreditForAccount(current, accountId, (credit) => ({ ...credit, enabled: credit.status === "approved" ? enabled : false }));
      });
      void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
        upsertCreditAccountInDb({
          customerId: accountId,
          status: "approved",
          limitAmount: targetLimit,
          usedAmount: targetUsed,
          enabled,
        });
      }).catch(() => {});
    },
    resetOwnerCreditUsed(accountId) {
      let targetLimit = 0;
      setStore((current) => {
        const target = current.accounts.find((a) => a.id === accountId);
        targetLimit = target?.credit?.limit || 0;
        return updateCreditForAccount(current, accountId, (credit) => ({ ...credit, used: 0 }));
      });
      void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
        upsertCreditAccountInDb({
          customerId: accountId,
          status: "approved",
          limitAmount: targetLimit,
          usedAmount: 0,
          enabled: true,
        });
      }).catch(() => {});
    },
    setOwnerCreditLimit(accountId, limit) {
      const safeLimit = Math.max(0, limit);
      let targetUsed = 0;
      setStore((current) => {
        const target = current.accounts.find((a) => a.id === accountId);
        targetUsed = target?.credit?.used || 0;
        return updateCreditForAccount(current, accountId, (credit) => ({
          ...credit,
          limit: safeLimit,
          status: safeLimit > 0 ? "approved" : credit.status,
          enabled: safeLimit > 0 ? (credit.enabled ?? true) : false,
        }));
      });
      void import("@/lib/supabase-service").then(({ upsertCreditAccountInDb }) => {
        upsertCreditAccountInDb({
          customerId: accountId,
          status: safeLimit > 0 ? "approved" : "none",
          limitAmount: safeLimit,
          usedAmount: targetUsed,
          enabled: safeLimit > 0,
        });
      }).catch(() => {});
    },
    cancelOwnerCreditRequest(accountId) { setStore((current) => updateCreditForAccount(current, accountId, () => cancelledCredit())); },
    addProduct(product) {
      if (!canManageCatalog(ownerMode)) return;
      const newId = (product as any).id || `product-${Date.now()}`;
      setStore((current) => {
        const cat = (product.category || "").trim();
        const existingCats = current.settings.catalogCategories ?? [...DEFAULT_CATALOG_CATEGORIES];
        const nextCats = cat && !existingCats.some((c) => c.toLowerCase() === cat.toLowerCase())
          ? [...existingCats, cat.charAt(0).toUpperCase() + cat.slice(1)]
          : existingCats;
        return {
          ...current,
          products: [{ ...product, id: newId }, ...current.products],
          settings: { ...current.settings, catalogCategories: nextCats },
        };
      });
      void import("@/lib/supabase-service").then(({ addProductToDb }) => addProductToDb({ ...product, id: newId })).catch(() => {});
    },
    updateProduct(id, next) {
      if (!canManageCatalog(ownerMode)) return;
      setStore((current) => ({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...next } : product) }));
      void import("@/lib/supabase-service").then(({ updateProductInDb }) => updateProductInDb(id, next)).catch(() => {});
    },
    removeProduct(id) {
      if (!canManageCatalog(ownerMode)) return;
      setStore((current) => syncActiveAccount(current, { ...current, products: current.products.filter((product) => product.id !== id), cart: current.cart.filter((line) => line.productId !== id) }));
      void import("@/lib/supabase-service").then(({ deleteProductFromDb }) => deleteProductFromDb(id)).catch(() => {});
    },
    saveFestivalBasket(festivalBasket) {
      setStore((current) => ({ ...current, festivalBasket }));
      if (festivalBasket) {
        void import("@/lib/supabase-service")
          .then(({ saveFestivalBasketToDb }) => saveFestivalBasketToDb(festivalBasket))
          .catch((e) => console.warn("Supabase saveFestivalBasket error:", e));
      }
    },
    updateSettings(next) {
      setStore((current) => { const settings = { ...current.settings, ...next }; return { ...current, settings: { ...settings, hours: composeStoreHours(settings.openingTime, settings.closingTime) } }; });
      void import("@/lib/supabase-service").then(({ updateStoreSettingsInDb }) => updateStoreSettingsInDb(next)).catch(() => {});
    },
  }), [activeAccount, cartCount, cartTotal, hydrated, ownerMode, ownerOrders, store]);
  return <NivStoreContext.Provider value={value}>{children}</NivStoreContext.Provider>;
}
export function useNivStore() {
  const value = useContext(NivStoreContext);
  if (!value) throw new Error("useNivStore must be used within NivStoreProvider");
  return value;
}

export const money = (amount?: number | string | null) => {
  const n = typeof amount === "number" ? amount : Number(amount) || 0;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};


