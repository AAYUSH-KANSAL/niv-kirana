import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { FlatList, Image, Text, TouchableOpacity, View } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import { money, type Product } from "@/lib/niv-store";
import { resolveProductImageUri } from "@/lib/product-image";
import {
  discountedShowcasePrice,
  nextShowcaseSlideIndex,
  productDiscount,
} from "@/shared/showcase-promotions";

const CARD_WIDTH = 190;
const CARD_GAP = 12;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const AUTO_ADVANCE_MS = 3500;

interface DealsCarouselProps {
  products: Product[];
  discounts?: Record<string, number>;
  cart: { productId: string; quantity: number }[];
  onAdd: (id: string, quantity?: number, unitPrice?: number) => void;
  onOpen: (id: string) => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export function DealsCarousel({
  products,
  discounts,
  cart,
  onAdd,
  onOpen,
  title = "Deals of the Day",
  subtitle = "आज के Special Picks – Handpicked discounts by NIV Kirana",
  badgeText = "SPECIAL PICKS",
}: DealsCarouselProps) {
  const sliderRef = useRef<FlatList<Product>>(null);
  const [, setActiveIndex] = useState(0);
  const [isUserSliding, setIsUserSliding] = useState(false);

  useEffect(() => {
    if (products.length < 2 || isUserSliding) return;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = nextShowcaseSlideIndex(current, products.length);
        sliderRef.current?.scrollToOffset({
          offset: nextIndex * CARD_STEP,
          animated: nextIndex !== 0,
        });
        return nextIndex;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [isUserSliding, products.length]);

  if (!products.length) return null;

  return (
    <View className="mb-4">
      {/* Header section */}
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center">
            <Text className="text-base font-black text-[#14221B] tracking-tight">
              {title}
            </Text>
            <View className="ml-2 px-2 py-0.5 rounded-full bg-[#EAF4D9] border border-[#CFE6B6] flex-row items-center">
              <MaterialIcons name="local-fire-department" size={11} color="#176B45" />
              <Text className="text-[10px] font-black text-[#176B45] ml-0.5">{badgeText}</Text>
            </View>
          </View>
          <Text className="text-xs text-[#5C6E63] mt-0.5">{subtitle}</Text>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <FlatList
        ref={sliderRef}
        data={products}
        horizontal
        snapToInterval={CARD_STEP}
        decelerationRate="fast"
        keyExtractor={(item) => `deal-${item.id}`}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: CARD_STEP,
          offset: CARD_STEP * index,
          index,
        })}
        onScrollBeginDrag={() => setIsUserSliding(true)}
        onMomentumScrollEnd={(event) => {
          setActiveIndex(
            Math.max(
              0,
              Math.min(
                products.length - 1,
                Math.round(event.nativeEvent.contentOffset.x / CARD_STEP)
              )
            )
          );
          setIsUserSliding(false);
        }}
        renderItem={({ item }) => {
          const promoDiscount = productDiscount(discounts, item.id);
          const sellingPrice =
            promoDiscount > 0
              ? discountedShowcasePrice(item.price, promoDiscount)
              : item.price;
          const regularPrice =
            item.mrp && item.mrp > sellingPrice
              ? item.mrp
              : (promoDiscount > 0 && item.mrp ? item.mrp : undefined);
          const discountPercent = regularPrice
            ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100)
            : promoDiscount;
          const inCartQuantity =
            cart
              .filter((line) => line.productId === item.id)
              .reduce((sum, line) => sum + line.quantity, 0);

          return (
            <DealCard
              product={item}
              offerPrice={sellingPrice}
              regularPrice={regularPrice}
              discountPercent={discountPercent}
              inCartQuantity={inCartQuantity}
              onAdd={onAdd}
              onOpen={() => onOpen(item.id)}
            />
          );
        }}
      />
    </View>
  );
}

function DealCard({
  product,
  offerPrice,
  regularPrice,
  discountPercent,
  inCartQuantity,
  onAdd,
  onOpen,
}: {
  product: Product;
  offerPrice: number;
  regularPrice?: number;
  discountPercent: number;
  inCartQuantity: number;
  onAdd: (id: string, quantity?: number, unitPrice?: number) => void;
  onOpen: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageUri = resolveProductImageUri(product.imageUrl, getApiBaseUrl());
  const inStock = product.stock > 0;
  const isAdded = inCartQuantity > 0;

  const handleAdd = () => {
    if (!inStock) return;
    onAdd(product.id, 1, offerPrice);
  };

  const handleRemove = () => {
    if (inCartQuantity <= 0) return;
    onAdd(product.id, -1, offerPrice);
  };

  return (
    <View
      style={{ width: CARD_WIDTH }}
      className="mr-3 rounded-[24px] bg-white border border-[#E2E8D8] p-3 justify-between"
    >
      <TouchableOpacity onPress={onOpen} activeOpacity={0.85}>
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

          {discountPercent > 0 ? (
            <View className="absolute top-2 left-2 rounded-full px-2 py-0.5 bg-[#176B45]">
              <Text className="text-[10px] font-black text-white">
                {discountPercent}% OFF
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          className="text-xs font-bold text-[#14221B] tracking-tight"
        >
          {product.name}
        </Text>
        <Text numberOfLines={1} className="text-[11px] font-medium text-[#5C6E63] mt-0.5">
          {product.unit}
        </Text>

        <View className="flex-row flex-wrap items-baseline mt-1.5 gap-x-1.5">
          <Text className="text-sm font-black text-[#176B45]">
            {money(offerPrice)}
          </Text>
          {regularPrice && regularPrice > offerPrice ? (
            <Text className="text-[11px] text-[#5C6E63] line-through font-medium">
              {money(regularPrice)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Add / Stepper action */}
      <View className="mt-2.5 pt-2 border-t border-[#E2E8D8]">
        {!inStock ? (
          <View className="py-1.5 rounded-xl bg-[#F0F0F0] items-center">
            <Text className="text-[10px] font-bold text-[#5C6E63]">Out of stock</Text>
          </View>
        ) : isAdded ? (
          <View className="flex-row items-center justify-between rounded-xl bg-[#176B45] px-1 py-1">
            <TouchableOpacity
              onPress={handleRemove}
              activeOpacity={0.8}
              className="h-6 w-6 rounded-lg bg-[#125436] items-center justify-center"
            >
              <MaterialIcons name="remove" size={14} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="text-xs font-black text-white">
              {inCartQuantity}
            </Text>

            <TouchableOpacity
              disabled={inCartQuantity >= product.stock}
              onPress={handleAdd}
              activeOpacity={0.8}
              className="h-6 w-6 rounded-lg bg-[#125436] items-center justify-center"
            >
              <MaterialIcons name="add" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.82}
            className="flex-row items-center justify-center rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] py-1.5"
          >
            <MaterialIcons name="add" size={14} color="#176B45" />
            <Text className="ml-1 text-xs font-black text-[#176B45] uppercase">
              Add
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
