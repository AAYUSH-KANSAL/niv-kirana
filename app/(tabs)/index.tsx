import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

import { CategoryNav } from "@/components/customer/category-nav";
import { CustomerHeader } from "@/components/customer/customer-header";
import { DealsCarousel } from "@/components/customer/deals-carousel";
import { ProductGridCard } from "@/components/customer/product-grid-card";
import { SearchBarSection } from "@/components/customer/search-bar-section";
import { ScreenContainer } from "@/components/screen-container";
import { money, useNivStore, type Product } from "@/lib/niv-store";
import { trpc } from "@/lib/trpc";
import { usableCatalogCategories } from "@/shared/catalog-categories";
import { normalizeCatalogSearch, productMatchesCatalogSearch } from "@/shared/catalog-search";
import { selectFeaturedProducts } from "@/shared/featured-products";
import { showcaseTagline } from "@/shared/showcase-promotions";

export default function HomeScreen() {
  const router = useRouter();
  const { products, addToCart, cart, cartCount, cartTotal, customer, settings, orders } = useNivStore();

  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [aiSearchIds, setAiSearchIds] = useState<string[] | null>(null);
  const [aiSearchStatus, setAiSearchStatus] = useState<"idle" | "loading" | "ready">("idle");

  const { mutateAsync: searchCatalog } = trpc.niv.aiSearchCatalog.useMutation();

  // India time updater every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Category and Search Filtering
  const categoryList = useMemo(
    () =>
      usableCatalogCategories([
        ...(settings.catalogCategories ?? []),
        ...products.map((p) => p.category),
      ]),
    [settings.catalogCategories, products]
  );

  const directSearchProducts = useMemo(
    () => products.filter((product) => productMatchesCatalogSearch(product, query)),
    [products, query]
  );

  const exactTextSearchProducts = useMemo(() => {
    const normalizedQuery = normalizeCatalogSearch(query);
    if (!normalizedQuery) return products;
    return products.filter((product) =>
      normalizeCatalogSearch(`${product.name} ${product.category} ${product.unit}`).includes(
        normalizedQuery
      )
    );
  }, [products, query]);

  const filteredProducts = useMemo(() => {
    const source = aiSearchIds
      ? products.filter((product) => aiSearchIds.includes(product.id))
      : directSearchProducts;
    return source.filter((product) => {
      if (category === "All") return true;
      return (
        product.category?.trim().toLowerCase() === category.trim().toLowerCase()
      );
    });
  }, [aiSearchIds, category, directSearchProducts, products]);

  // AI Semantic Search Effect
  useEffect(() => {
    const normalizedQuery = query.trim();
    setAiSearchIds(null);
    setAiSearchStatus("idle");

    if (normalizedQuery.length < 2 || exactTextSearchProducts.length > 0) return;

    let active = true;
    const timer = setTimeout(() => {
      setAiSearchStatus("loading");
      void searchCatalog({
        query: normalizedQuery,
        products: products.map(({ id, name, category: cat, price, unit }) => ({
          id,
          name,
          category: cat,
          price,
          unit,
        })),
      })
        .then((result) => {
          if (!active) return;
          const ids = result.matches.map((match) => match.productId);
          setAiSearchIds(ids.length ? ids : []);
          setAiSearchStatus("ready");
        })
        .catch(() => {
          if (!active) return;
          setAiSearchIds([]);
          setAiSearchStatus("ready");
        });
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [exactTextSearchProducts.length, products, query, searchCatalog]);

  const featuredProducts = useMemo(
    () => selectFeaturedProducts(products, settings.featuredProductIds),
    [products, settings.featuredProductIds]
  );

  // Group products into 2-column pairs for clean rendering
  const productRows = useMemo(() => {
    const rows: Product[][] = [];
    for (let i = 0; i < filteredProducts.length; i += 2) {
      rows.push(filteredProducts.slice(i, i + 2));
    }
    return rows;
  }, [filteredProducts]);

  // Check if current customer has any active live order placed TODAY
  const todayCustomerLiveOrder = useMemo(() => {
    const today = [now.getFullYear(), now.getMonth(), now.getDate()].join("-");
    const myOrders = (orders || []).filter(
      (o) => (customer.phone && o.customer?.phone === customer.phone) || (customer.phone && o.customerId === customer.phone)
    );
    return myOrders.find((o) => {
      if (o.status === "Delivered" || o.status === "Cancelled") return false;
      if (!o.createdAt) return false;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return false;
      const orderDay = [orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()].join("-");
      return orderDay === today;
    });
  }, [orders, customer.phone, now]);

  return (
    <ScreenContainer className="px-4" containerClassName="bg-background">
      <FlatList
        data={productRows}
        keyExtractor={(_, index) => `product-row-${index}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Top Store Header */}
            <CustomerHeader
              storeName={settings.storeName}
              customerName={customer.name}
              deliveryRadius={settings.deliveryRadius}
              cartCount={cartCount}
              now={now}
              isOpen={settings.isOpen !== false}
            />

            {/* Live Order Banner (strictly today's active order) */}
            {todayCustomerLiveOrder && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => router.push("/orders" as never)}
                className="mb-3 p-3.5 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex-row items-center justify-between shadow-xs"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="h-10 w-10 rounded-xl bg-[#2563EB] items-center justify-center mr-3">
                    <MaterialIcons name="local-shipping" size={20} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-xs font-black text-[#1E40AF]">
                        Live Order: #{todayCustomerLiveOrder.id}
                      </Text>
                      <View className="ml-2 px-2 py-0.5 rounded-full bg-[#DBEAFE]">
                        <Text className="text-[10px] font-black text-[#1E40AF]">
                          {todayCustomerLiveOrder.status}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-[11px] text-[#1E3A8A] font-semibold mt-0.5">
                      {money(todayCustomerLiveOrder.total)} · Tap to track order live
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}

            {/* Store Closed Notice Banner */}
            {settings.isOpen === false && (
              <View className="mb-3 p-3 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex-row items-center">
                <View className="h-8 w-8 rounded-xl bg-[#DC2626] items-center justify-center mr-2.5 flex-shrink-0">
                  <MaterialIcons name="storefront" size={18} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-[#991B1B]">
                    Dukaan Filhaal Band Hai (Store Closed)
                  </Text>
                  <Text className="text-[11px] font-semibold text-[#B91C1C] mt-0.5">
                    Timings: {settings.hours}. Aap abhi order add kar sakte hain, dukan khulte hi deliver hoga.
                  </Text>
                </View>
              </View>
            )}

            {/* Deals of the Day / Aaj Ke Special Picks (Admin-controlled, shown first) */}
            {featuredProducts.length > 0 && !query.trim() ? (
              <DealsCarousel
                title="Deals of the Day"
                subtitle="आज के Special Picks – Handpicked discounts by NIV Kirana"
                badgeText="SPECIAL PICKS"
                products={featuredProducts}
                discounts={settings.featuredProductDiscounts}
                cart={cart}
                onAdd={addToCart}
                onOpen={(id) => router.push(`/product/${id}` as never)}
              />
            ) : null}

            {/* Smart Search Bar */}
            <SearchBarSection
              query={query}
              onQueryChange={setQuery}
              aiSearchStatus={aiSearchStatus}
              aiSearchCount={aiSearchIds?.length ?? 0}
            />

            {/* Horizontal Category Navigation */}
            <CategoryNav
              categories={categoryList}
              selectedCategory={category}
              onSelectCategory={setCategory}
            />

            {/* All Groceries Section Header */}
            <View className="flex-row items-baseline justify-between mb-3 px-0.5">
              <View>
                <Text className="text-lg font-black text-foreground tracking-tight">
                  {category === "All" ? "All Groceries (सारी राशन सामग्री)" : category}
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  {filteredProducts.length} items available in Kuchesar
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item: row }) => {
          return (
            <View className="mb-2">
              {/* 2-Column Product Grid Row (Continuous scroll of all groceries) */}
              <View className="flex-row justify-between">
                {row.map((product) => {
                  const itemCartQuantity = cart
                    .filter((line) => line.productId === product.id)
                    .reduce((sum, line) => sum + line.quantity, 0);

                  return (
                    <ProductGridCard
                      key={product.id}
                      product={product}
                      cartQuantity={itemCartQuantity}
                      onAdd={addToCart}
                      onOpen={() => router.push(`/product/${product.id}` as never)}
                    />
                  );
                })}
                {/* Dummy placeholder spacer if odd number in row */}
                {row.length === 1 ? <View className="w-[48.5%]" /> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="py-16 items-center">
            <View className="h-16 w-16 rounded-3xl bg-[#EAF4D9] items-center justify-center mb-3">
              <MaterialIcons name="search-off" size={32} color="#176B45" />
            </View>
            <Text className="text-base font-extrabold text-foreground">
              Koi product nahi mila
            </Text>
            <Text className="text-xs text-muted mt-1 text-center px-8">
              Spelling check karein ya dusra naam search karein (jaise: atta, doodh, biscuit).
            </Text>
          </View>
        }
        ListFooterComponent={<View className="h-28" />}
      />

      {/* Floating Bottom Cart Bar (Zomato-Style) */}
      {cartCount > 0 ? (
        <View className="absolute bottom-3 left-4 right-4 z-40">
          <TouchableOpacity
            accessibilityLabel="Cart खोलें और order पूरा करें"
            onPress={() => router.push("/cart" as never)}
            activeOpacity={0.9}
            style={{
              backgroundColor: "#176B45",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 8,
            }}
            className="flex-row items-center justify-between px-4 py-3 rounded-2xl"
          >
            <View className="flex-row items-center">
              <View
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                className="h-8 w-8 rounded-full items-center justify-center mr-2.5"
              >
                <MaterialIcons name="shopping-bag" size={17} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-xs font-black text-white">
                  {cartCount} {cartCount === 1 ? "item" : "items"} in cart
                </Text>
                <Text className="text-[11px] font-bold text-white/90">
                  {money(cartTotal)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Text className="text-xs font-black text-white mr-1 uppercase">
                View Cart
              </Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
