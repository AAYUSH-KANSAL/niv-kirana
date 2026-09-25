import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { money, type FestivalBasketItem, useNivStore } from "@/lib/niv-store";
import { changeFestivalQuantity, festivalBasketTotal } from "@/shared/festival-basket";

export function PublishedFestivalBasket() {
  const router = useRouter();
  const { festivalBasket, products, addToCart } = useNivStore();
  const [items, setItems] = useState<FestivalBasketItem[]>(festivalBasket?.items ?? []);

  useEffect(() => {
    setItems(festivalBasket?.items ?? []);
  }, [festivalBasket?.updatedAt, festivalBasket?.items]);

  const total = useMemo(
    () =>
      festivalBasketTotal(
        items,
        (id) => products.find((product) => product.id === id)?.price ?? 0
      ),
    [items, products]
  );

  if (!festivalBasket?.published || items.length === 0) return null;

  const changeQuantity = (productId: string, delta: number) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: changeFestivalQuantity(
                item.quantity,
                delta,
                products.find((product) => product.id === productId)?.stock ?? 1
              ),
            }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const addBasketToCart = () => {
    items.forEach((item) => addToCart(item.productId, item.quantity));
    router.push("/cart" as never);
  };

  return (
    <View className="rounded-3xl bg-white border border-[#E2E8D8] p-5 mt-5 shadow-sm">
      {/* Header Banner */}
      <View className="flex-row items-start">
        <View className="h-11 w-11 rounded-2xl bg-[#EAF4D9] items-center justify-center mr-3">
          <MaterialIcons name="celebration" size={24} color="#176B45" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <View className="bg-[#EAF4D9] px-2.5 py-0.5 rounded-full border border-[#CFE6B6]">
              <Text className="text-[10px] font-black text-[#176B45] uppercase tracking-wider">
                AI FESTIVE PICK
              </Text>
            </View>
            <Text className="ml-2 text-[11px] font-bold text-[#5C6E63]">
              {festivalBasket.occasion || "Festival Special"}
            </Text>
          </View>
          <Text className="text-lg font-black text-[#14221B] mt-1.5 leading-6">
            {festivalBasket.title}
          </Text>
          {festivalBasket.description ? (
            <Text className="text-xs text-[#5C6E63] mt-1 leading-5">
              {festivalBasket.description}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Editable Items */}
      <View className="mt-4 pt-3 border-t border-[#E2E8D8]">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-black text-[#14221B] uppercase tracking-wider">
            Items in combo ({items.length})
          </Text>
          <Text className="text-xs text-[#5C6E63]">Tap +/- to customize</Text>
        </View>

        <View className="divide-y divide-[#E2E8D8]">
          {items.map((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            if (!product) return null;
            return (
              <View key={item.productId} className="flex-row items-center py-3">
                <Text className="text-2xl mr-3">{product.icon || "📦"}</Text>
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-bold text-[#14221B]" numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text className="text-[11px] text-[#5C6E63] mt-0.5">
                    {item.reason || "Festival Essential"} · {money(product.price)} / {product.unit}
                  </Text>
                </View>

                {/* Line total & Stepper */}
                <View className="items-end">
                  <Text className="text-xs font-black text-[#176B45]">
                    {money(product.price * item.quantity)}
                  </Text>
                  <View className="flex-row items-center mt-1.5">
                    <TouchableOpacity
                      onPress={() => changeQuantity(item.productId, -1)}
                      activeOpacity={0.7}
                      className="h-7 w-7 rounded-lg bg-[#FAF8F5] border border-[#E2E8D8] items-center justify-center"
                    >
                      <MaterialIcons name="remove" size={14} color="#14221B" />
                    </TouchableOpacity>
                    <Text className="w-7 text-center text-xs font-black text-[#14221B]">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => changeQuantity(item.productId, 1)}
                      activeOpacity={0.7}
                      className="h-7 w-7 rounded-lg bg-[#176B45] items-center justify-center"
                    >
                      <MaterialIcons name="add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeItem(item.productId)}
                      activeOpacity={0.7}
                      className="ml-2 h-7 w-7 rounded-lg bg-[#FAF8F5] border border-[#E2E8D8] items-center justify-center"
                    >
                      <MaterialIcons name="delete-outline" size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bill summary */}
      <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-[#E2E8D8]">
        <View>
          <Text className="text-xs text-[#5C6E63] font-bold">Total Combo Price</Text>
          <Text className="text-xl font-black text-[#14221B] mt-0.5">
            {money(total)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setItems(festivalBasket.items)}
          activeOpacity={0.7}
          className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8]"
        >
          <Text className="text-xs font-bold text-[#5C6E63]">Reset items</Text>
        </TouchableOpacity>
      </View>

      {/* Add To Cart Button */}
      <TouchableOpacity
        disabled={items.length === 0}
        onPress={addBasketToCart}
        activeOpacity={0.85}
        className={`flex-row justify-center items-center rounded-2xl py-4 mt-4 ${
          items.length === 0 ? "bg-[#D1D5DB]" : "bg-[#176B45]"
        }`}
      >
        <MaterialIcons name="shopping-bag" size={20} color="#FFFFFF" />
        <Text className="ml-2 text-sm font-black text-white">
          Add Complete Basket & Go to Cart ({money(total)})
        </Text>
      </TouchableOpacity>
    </View>
  );
}
