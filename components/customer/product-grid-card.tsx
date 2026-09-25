import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { money, type Product } from "@/lib/niv-store";
import { resolveProductImageUri } from "@/lib/product-image";

interface ProductGridCardProps {
  product: Product;
  cartQuantity: number;
  onAdd: (id: string, quantity?: number, unitPrice?: number) => void;
  onOpen: () => void;
}

export function ProductGridCard({
  product,
  cartQuantity,
  onAdd,
  onOpen,
}: ProductGridCardProps) {
  const [imageError, setImageError] = useState(false);
  const inStock = product.stock > 0;
  const isAdded = cartQuantity > 0;
  const imageUri = resolveProductImageUri(product.imageUrl, getApiBaseUrl());

  const regularPrice = product.mrp && product.mrp > product.price ? product.mrp : undefined;
  const discountPercent = regularPrice
    ? Math.round(((regularPrice - product.price) / regularPrice) * 100)
    : 0;

  const handleIncrement = () => {
    if (!inStock || cartQuantity >= product.stock) return;
    onAdd(product.id, 1);
  };

  const handleDecrement = () => {
    if (cartQuantity <= 0) return;
    onAdd(product.id, -1);
  };

  const handleFirstAdd = () => {
    if (!inStock) return;
    onAdd(product.id, 1);
  };

  return (
    <View className="w-[48.5%] rounded-[24px] border border-[#E2E8D8] bg-white p-3 mb-3.5 justify-between">
      {/* Product Image & Badges */}
      <TouchableOpacity
        accessibilityLabel={`${product.name} details खोलें`}
        onPress={onOpen}
        activeOpacity={0.85}
      >
        <View className="h-28 rounded-[18px] bg-[#FAF8F5] overflow-hidden items-center justify-center relative mb-2.5">
          {imageUri && !imageError ? (
            <Image
              source={{ uri: imageUri }}
              accessibilityLabel={`${product.name} product photo`}
              onError={() => setImageError(true)}
              resizeMode="cover"
              className="h-full w-full"
            />
          ) : (
            <Text className="text-4xl">{product.icon || "🛒"}</Text>
          )}

          {/* Low Stock or Discount Badge */}
          {product.stock <= 5 ? (
            <View className="absolute top-2 left-2 rounded-full px-2 py-0.5 bg-[#FFF7ED] border border-[#FFEDD5]">
              <Text className="text-[9px] font-extrabold text-[#C2410C]">
                {inStock ? `Only ${product.stock} left` : "Sold out"}
              </Text>
            </View>
          ) : discountPercent > 0 ? (
            <View className="absolute top-2 left-2 rounded-full px-2 py-0.5 bg-[#EAF4D9] border border-[#CFE6B6]">
              <Text className="text-[9px] font-black text-[#176B45]">
                {discountPercent}% OFF
              </Text>
            </View>
          ) : null}
        </View>

        {/* Product Category & Name */}
        <Text
          numberOfLines={2}
          className="text-xs font-bold text-[#14221B] leading-[18px] min-h-[36px]"
        >
          {product.name}
        </Text>

        {/* Unit */}
        <Text numberOfLines={1} className="text-[11px] font-medium text-[#5C6E63] mt-0.5">
          {product.unit}
        </Text>
      </TouchableOpacity>

      {/* Pricing and Action Button Footer */}
      <View className="mt-2.5 pt-2 border-t border-[#E2E8D8] flex-row items-center justify-between">
        <View className="flex-1 pr-1">
          <Text className="text-sm font-black text-[#14221B]">
            {money(product.price)}
          </Text>
          {regularPrice ? (
            <Text className="text-[10px] text-[#5C6E63] line-through">
              {money(regularPrice)}
            </Text>
          ) : null}
        </View>

        {/* Dynamic Action: ADD vs Quantity Stepper */}
        {!inStock ? (
          <View className="px-2.5 py-1.5 rounded-xl bg-[#F0F0F0]">
            <Text className="text-[10px] font-bold text-[#5C6E63]">Sold out</Text>
          </View>
        ) : isAdded ? (
          <View className="flex-row items-center rounded-xl bg-[#176B45] px-1 py-1">
            <TouchableOpacity
              accessibilityLabel={`${product.name} quantity घटाएँ`}
              onPress={handleDecrement}
              activeOpacity={0.8}
              className="h-6 w-6 rounded-lg bg-[#125436] items-center justify-center"
            >
              <MaterialIcons name="remove" size={14} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="w-6 text-center text-xs font-black text-white">
              {cartQuantity}
            </Text>

            <TouchableOpacity
              accessibilityLabel={`${product.name} quantity बढ़ाएँ`}
              disabled={cartQuantity >= product.stock}
              onPress={handleIncrement}
              activeOpacity={0.8}
              className={`h-6 w-6 rounded-lg items-center justify-center ${
                cartQuantity >= product.stock ? "bg-[#125436] opacity-50" : "bg-[#125436]"
              }`}
            >
              <MaterialIcons name="add" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityLabel={`${product.name} cart में add करें`}
            onPress={handleFirstAdd}
            activeOpacity={0.82}
            className="flex-row items-center rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] px-3 py-1.5"
          >
            <MaterialIcons name="add" size={14} color="#176B45" />
            <Text className="ml-0.5 text-xs font-black text-[#176B45] uppercase">
              Add
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
