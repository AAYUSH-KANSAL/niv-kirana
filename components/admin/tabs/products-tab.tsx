import React, { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { money, type Product } from "@/lib/niv-store";
import { DEFAULT_CATALOG_CATEGORIES, usableCatalogCategories } from "@/shared/catalog-categories";

interface ProductsTabProps {
  products: Product[];
  productSearch: string;
  onSearchChange: (text: string) => void;
  onOpenAddModal: () => void;
  onEditProduct?: (product: Product) => void;
  onUpdateStock: (product: Product, newStock: number) => void;
  onDeleteProduct: (product: Product) => void;
  categories?: string[];
  onAddCategory?: (category: string) => Promise<void>;
  featuredProductIds?: string[];
  onToggleFeaturedProduct?: (product: Product) => void;
}

export function ProductsTab({
  products,
  productSearch,
  onSearchChange,
  onOpenAddModal,
  onEditProduct,
  onUpdateStock,
  onDeleteProduct,
  categories,
  onAddCategory,
  featuredProductIds = [],
  onToggleFeaturedProduct,
}: ProductsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const featuredCount = useMemo(() => {
    return products.filter(
      (p) => Boolean(p.featured) || Boolean(featuredProductIds.includes(p.id))
    ).length;
  }, [products, featuredProductIds]);

  const categoryChips = useMemo(() => {
    const dynamicList = (categories ?? DEFAULT_CATALOG_CATEGORIES).filter(
      (c) => c && c.trim() && c.toLowerCase() !== "all"
    );
    const productCategories = products
      .map((p) => p.category)
      .filter((c): c is string => Boolean(c && c.trim() && c.toLowerCase() !== "all"));
    const merged = Array.from(new Set([...dynamicList, ...productCategories]));
    return ["All", `⭐ Deals (${featuredCount})`, ...merged];
  }, [categories, products, featuredCount]);

  const filtered = products.filter((p) => {
    const query = productSearch.trim().toLowerCase();
    const matchSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      (p.category && p.category.toLowerCase().includes(query));

    const matchCategory = (() => {
      if (selectedCategory === "All") return true;
      if (selectedCategory.startsWith("⭐ Deals")) {
        return Boolean(p.featured) || Boolean(featuredProductIds.includes(p.id));
      }
      return p.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
    })();

    return matchSearch && matchCategory;
  });

  const handleCreateCategory = async () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) {
      Alert.alert("Name Required", "Kripya category ka naam likhein.");
      return;
    }
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (formatted.toLowerCase() === "all") {
      Alert.alert("Invalid Name", "'All' category reserve hai.");
      return;
    }

    setSavingCategory(true);
    try {
      if (onAddCategory) {
        await onAddCategory(formatted);
      }
      setSelectedCategory(formatted);
      setNewCatInput("");
      setIsAddingCategory(false);
      Alert.alert("Category Added", `Category "${formatted}" successfully add ho gayi.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Category add nahi ho saki.");
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <View className="space-y-3">
      {/* Top Controls: Search + Add Button */}
      <View className="flex-row items-center gap-2">
        <View className="flex-1 flex-row items-center rounded-xl bg-surface border border-border px-3.5 py-1.5">
          <MaterialIcons name="search" size={20} color="#74847A" />
          <TextInput
            value={productSearch}
            onChangeText={onSearchChange}
            placeholder="Search product by name or category..."
            placeholderTextColor="#74847A"
            className="flex-1 ml-2 text-xs text-foreground py-1"
          />
          {productSearch.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <MaterialIcons name="close" size={16} color="#74847A" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={onOpenAddModal}
          activeOpacity={0.85}
          className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-primary"
        >
          <MaterialIcons name="add" size={18} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Inline New Category Input Box */}
      {isAddingCategory ? (
        <View className="rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-3 mb-1">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-black text-[#15803D]">
              Nayi Category Add Karein
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsAddingCategory(false);
                setNewCatInput("");
              }}
            >
              <MaterialIcons name="close" size={18} color="#15803D" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={newCatInput}
              onChangeText={setNewCatInput}
              placeholder="e.g. Spices, Bakery, Organic..."
              placeholderTextColor="#828282"
              autoFocus
              className="flex-1 rounded-xl bg-white border border-[#BBF7D0] px-3 py-2 text-xs text-foreground"
            />
            <TouchableOpacity
              onPress={handleCreateCategory}
              disabled={savingCategory}
              activeOpacity={0.8}
              className="px-4 py-2 rounded-xl bg-[#16A34A] items-center justify-center"
            >
              <Text className="text-xs font-black text-white">
                {savingCategory ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-center gap-1.5 py-1">
          {categoryChips.map((cat, index) => {
            const active =
              selectedCategory.trim().toLowerCase() === cat.trim().toLowerCase();
            return (
              <TouchableOpacity
                key={`cat-filter-${cat}-${index}`}
                onPress={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full border ${
                  active
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    active ? "text-white" : "text-[#495A50]"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Quick Add Category Chip */}
          <TouchableOpacity
            onPress={() => setIsAddingCategory(!isAddingCategory)}
            activeOpacity={0.7}
            className="flex-row items-center px-3 py-1.5 rounded-full border border-dashed border-[#16A34A] bg-[#F0FDF4]"
          >
            <MaterialIcons name="add" size={14} color="#16A34A" />
            <Text className="text-xs font-bold text-[#16A34A] ml-0.5">
              + Category
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Products Counter */}
      <View className="flex-row justify-between items-center py-1">
        <Text className="text-xs font-black uppercase tracking-wider text-muted">
          Showing {filtered.length} products
        </Text>
      </View>

      {/* Products Grid / Cards */}
      {filtered.length === 0 ? (
        <View className="rounded-2xl bg-surface border border-border p-8 items-center justify-center mt-4">
          <MaterialIcons name="inventory-2" size={42} color="#CFE6B6" />
          <Text className="text-sm font-bold text-foreground mt-2">
            No products found
          </Text>
          <Text className="text-xs text-muted text-center mt-1">
            Try adjusting your search terms or category selection.
          </Text>
        </View>
      ) : (
        filtered.map((item) => {
          const isLowStock = item.stock <= 5;
          return (
            <View
              key={item.id}
              className="rounded-2xl bg-surface border border-border p-3.5 mb-2.5 flex-row items-center justify-between"
            >
              {/* Product Info */}
              <View className="flex-1 min-w-0 mr-2.5 flex-row items-center">
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    className="h-11 w-11 rounded-xl bg-[#F5F5F5] mr-2.5 border border-[#E8E8E8] flex-shrink-0"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-11 w-11 rounded-xl bg-[#F8F9FA] border border-[#E8E8E8] items-center justify-center mr-2.5 flex-shrink-0">
                    <Text className="text-xl">{item.icon || "📦"}</Text>
                  </View>
                )}

                <View className="flex-1 min-w-0">
                  <Text
                    className="text-sm font-black text-foreground"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  {/* Responsive Pricing Row with flex-wrap and gap */}
                  <View className="flex-row flex-wrap items-baseline gap-x-1.5 gap-y-0.5 mt-0.5">
                    <Text className="text-sm font-black text-primary">
                      {money(item.price)}
                    </Text>
                    {item.mrp && item.mrp > item.price ? (
                      <Text className="text-xs text-muted line-through font-medium">
                        {money(item.mrp)}
                      </Text>
                    ) : null}
                    <Text className="text-[11px] text-[#5C6E63] font-semibold">· {item.unit}</Text>
                  </View>

                  <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
                    <View className="px-1.5 py-0.5 rounded-md bg-[#F0F5ED]">
                      <Text className="text-[9px] font-bold text-[#495A50]">
                        {item.category}
                      </Text>
                    </View>
                    {item.description ? (
                      <Text className="text-[10px] text-muted flex-1" numberOfLines={1}>
                        · {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Stock Stepper & Action Controls */}
              <View className="flex-shrink-0 items-end justify-center">
                {/* Top Badges Row */}
                <View className="flex-row items-center gap-1.5 mb-1.5 justify-end">
                  {/* Deal of the Day Toggle Button */}
                  <TouchableOpacity
                    onPress={() => onToggleFeaturedProduct?.(item)}
                    activeOpacity={0.75}
                    className={`flex-row items-center px-2 py-0.5 rounded-full border ${
                      Boolean(item.featured) || Boolean(featuredProductIds.includes(item.id))
                        ? "bg-[#FEF3C7] border-[#F59E0B]"
                        : "bg-surface border-border"
                    }`}
                  >
                    <MaterialIcons
                      name={
                        Boolean(item.featured) || Boolean(featuredProductIds.includes(item.id))
                          ? "star"
                          : "star-border"
                      }
                      size={12}
                      color={
                        Boolean(item.featured) || Boolean(featuredProductIds.includes(item.id))
                          ? "#D97706"
                          : "#687178"
                      }
                    />
                    <Text
                      className={`text-[9px] font-black ml-0.5 ${
                        Boolean(item.featured) || Boolean(featuredProductIds.includes(item.id))
                          ? "text-[#D97706]"
                          : "text-[#687178]"
                      }`}
                    >
                      {Boolean(item.featured) || Boolean(featuredProductIds.includes(item.id))
                        ? "Deal of Day"
                        : "+ Deal"}
                    </Text>
                  </TouchableOpacity>

                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      isLowStock
                        ? "bg-[#FFF7ED] border border-[#FED7AA]"
                        : "bg-[#ECFDF5] border border-[#A7F3D0]"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-black ${
                        isLowStock ? "text-[#C2410C]" : "text-[#047857]"
                      }`}
                    >
                      {item.stock} in stock
                    </Text>
                  </View>
                </View>

                {/* Bottom Action Buttons Row */}
                <View className="flex-row items-center gap-1">
                  <TouchableOpacity
                    onPress={() => onUpdateStock(item, Math.max(0, item.stock - 1))}
                    activeOpacity={0.7}
                    accessibilityLabel={`Decrease stock for ${item.name}`}
                    className="h-8 w-8 rounded-xl bg-surface border border-border items-center justify-center"
                  >
                    <MaterialIcons name="remove" size={16} color="#495A50" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => onUpdateStock(item, item.stock + 5)}
                    activeOpacity={0.75}
                    accessibilityLabel={`Restock +5 for ${item.name}`}
                    className="h-8 px-2 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center"
                  >
                    <Text className="text-[11px] font-bold text-[#176B45]">
                      +5 Restock
                    </Text>
                  </TouchableOpacity>

                  {/* Edit Product Button */}
                  <TouchableOpacity
                    onPress={() => onEditProduct?.(item)}
                    activeOpacity={0.75}
                    accessibilityLabel={`Edit ${item.name}`}
                    className="h-8 px-2 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] flex-row items-center justify-center"
                  >
                    <MaterialIcons name="edit" size={13} color="#176B45" />
                    <Text className="text-[11px] font-bold text-[#176B45] ml-0.5">
                      Edit
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Product Button */}
                  <TouchableOpacity
                    onPress={() => onDeleteProduct(item)}
                    activeOpacity={0.75}
                    accessibilityLabel={`Delete ${item.name}`}
                    className="h-8 w-8 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] items-center justify-center"
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
