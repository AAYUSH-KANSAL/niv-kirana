import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { money, type FestivalBasket, type FestivalBasketItem, type Product, useNivStore } from "@/lib/niv-store";
import { trpc } from "@/lib/trpc";
import { changeFestivalQuantity, festivalBasketTotal } from "@/shared/festival-basket";

type FestivalDraft = Pick<FestivalBasket, "title" | "occasion" | "description" | "items">;

export function FestivalBasketManager() {
  const { products, festivalBasket, saveFestivalBasket } = useNivStore();
  const [occasion, setOccasion] = useState(festivalBasket?.occasion ?? "Diwali");
  const [ownerNote, setOwnerNote] = useState("Pakodi, chai aur cold drink ke saath popular Diwali essentials");
  const [draft, setDraft] = useState<FestivalDraft | null>(
    festivalBasket
      ? {
          title: festivalBasket.title,
          occasion: festivalBasket.occasion,
          description: festivalBasket.description,
          items: festivalBasket.items,
        }
      : null
  );
  const generator = trpc.niv.aiFestivalBasket.useMutation();

  useEffect(() => {
    if (festivalBasket && !draft) {
      setDraft({
        title: festivalBasket.title,
        occasion: festivalBasket.occasion,
        description: festivalBasket.description,
        items: festivalBasket.items,
      });
    }
  }, [festivalBasket, draft]);

  const total = useMemo(
    () =>
      festivalBasketTotal(
        draft?.items ?? [],
        (id) => products.find((product) => product.id === id)?.price ?? 0
      ),
    [draft, products]
  );

  const buildAiFestivalBasket = async () => {
    if (occasion.trim().length < 2) {
      Alert.alert("Festival name", "Festival ya occasion ka naam likhein (e.g. Diwali, Holi, Monthly Ration).");
      return;
    }
    try {
      const result = await generator.mutateAsync({
        occasion: occasion.trim(),
        ownerNote: ownerNote.trim(),
        products: products.map(({ id, name, category, price, unit }) => ({
          id,
          name,
          category,
          price,
          unit,
        })),
      });
      setDraft({
        title: result.title,
        occasion: occasion.trim(),
        description: result.description,
        items: result.items,
      });
      Alert.alert("AI Basket Ready", `${result.title} generate ho gaya! Aap items check karke publish kar sakte hain.`);
    } catch {
      Alert.alert("AI basket unavailable", "Abhi AI basket generate nahi ho paya. Products manually add karke publish kar sakte hain.");
    }
  };

  const editItem = (productId: string, change: number) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => {
          if (item.productId !== productId) return item;
          const maxStock = products.find((p) => p.id === productId)?.stock ?? 1;
          return {
            ...item,
            quantity: changeFestivalQuantity(item.quantity, change, maxStock),
          };
        }),
      };
    });
  };

  const removeItem = (productId: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.filter((item) => item.productId !== productId),
      };
    });
  };

  const addProduct = (product: Product) => {
    setDraft((current) => {
      const starter: FestivalDraft = current ?? {
        title: `${occasion || "Festival"} Smart Basket`,
        occasion: occasion || "Festival",
        description: "Owner curated festival essentials combo pack",
        items: [],
      };
      const alreadyAdded = starter.items.some((item) => item.productId === product.id);
      return {
        ...starter,
        items: alreadyAdded
          ? starter.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: changeFestivalQuantity(item.quantity, 1, product.stock) }
                : item
            )
          : [...starter.items, { productId: product.id, quantity: 1, reason: "Store Owner Pick" }],
      };
    });
  };

  const publish = () => {
    if (!draft || draft.items.length === 0) {
      Alert.alert("Empty Basket", "Publish karne se pehle kam-se-kam 1 product add karein.");
      return;
    }
    saveFestivalBasket({
      id: festivalBasket?.id ?? `festival-${Date.now()}`,
      ...draft,
      published: true,
      updatedAt: "Just now",
    });
    Alert.alert(
      "Smart Basket Published! 🚀",
      "Customers ko ab Home Screen aur Smart Basket tab me ye combo live dikhega aur 1-click se cart me add ho sakega."
    );
  };

  const unpublish = () => {
    if (!festivalBasket) return;
    saveFestivalBasket({
      ...festivalBasket,
      published: false,
      updatedAt: "Just now",
    });
    Alert.alert("Smart Basket Unpublished", "Customers ki screen se Smart Basket hide kar diya gaya hai.");
  };

  return (
    <View className="space-y-4">
      {/* Status & Banner Card */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-start flex-1 mr-2">
            <View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] items-center justify-center mr-3">
              <MaterialIcons name="auto-awesome" size={22} color="#176B45" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-[#14221B]">
                NIV Smart Basket Manager
              </Text>
              <Text className="text-xs text-[#5C6E63] mt-0.5 leading-4">
                Festival ya monthly ration ke curated grocery combos banayein aur customers ke liye live publish karein.
              </Text>
            </View>
          </View>

          {/* Current Live Badge */}
          <View
            className={`px-2.5 py-1 rounded-full border ${
              festivalBasket?.published
                ? "bg-[#EAF4D9] border-[#CFE6B6]"
                : "bg-[#FAF8F5] border-[#E2E8D8]"
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase ${
                festivalBasket?.published ? "text-[#176B45]" : "text-[#5C6E63]"
              }`}
            >
              {festivalBasket?.published ? "● Live on App" : "Draft / Hidden"}
            </Text>
          </View>
        </View>

        {/* Input Form */}
        <View className="mt-4 pt-3 border-t border-[#E2E8D8]">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C6E63] mb-1">
            Festival / Occasion Name
          </Text>
          <TextInput
            value={occasion}
            onChangeText={setOccasion}
            placeholder="e.g. Diwali, Holi, Navratri, Monthly Ration"
            placeholderTextColor="#828282"
            className="rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] px-3.5 py-2.5 text-xs text-[#14221B] font-bold"
          />

          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C6E63] mt-3 mb-1">
            Owner Note / Key Items Focus
          </Text>
          <TextInput
            value={ownerNote}
            onChangeText={setOwnerNote}
            multiline
            placeholder="e.g. Atta, oil, tea, sweets aur snack items ka mix"
            placeholderTextColor="#828282"
            className="min-h-16 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] px-3.5 py-2.5 text-xs text-[#14221B]"
          />

          <TouchableOpacity
            onPress={() => void buildAiFestivalBasket()}
            disabled={generator.isPending}
            activeOpacity={0.82}
            className={`flex-row items-center justify-center rounded-xl py-3 mt-3 ${
              generator.isPending ? "bg-[#D1D5DB]" : "bg-[#176B45]"
            }`}
          >
            <MaterialIcons
              name={generator.isPending ? "hourglass-top" : "auto-awesome"}
              size={18}
              color="#FFFFFF"
            />
            <Text className="ml-2 text-xs font-black text-white">
              {generator.isPending ? "AI Basket Generating..." : "Generate AI Smart Basket"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Draft & Product Selection Card */}
      {draft ? (
        <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-black text-[#14221B]">
              Basket Preview & Content
            </Text>
            <Text className="text-sm font-black text-[#176B45]">
              Total: {money(total)}
            </Text>
          </View>

          {/* Title & Description Inputs */}
          <TextInput
            value={draft.title}
            onChangeText={(title) => setDraft((current) => (current ? { ...current, title } : current))}
            placeholder="Basket Title (e.g. Diwali Shubh Labh Basket)"
            placeholderTextColor="#828282"
            className="text-sm font-black text-[#14221B] border-b border-[#E2E8D8] pb-2 mb-2"
          />
          <TextInput
            value={draft.description}
            onChangeText={(description) =>
              setDraft((current) => (current ? { ...current, description } : current))
            }
            placeholder="Customer-facing note"
            placeholderTextColor="#828282"
            multiline
            className="text-xs text-[#5C6E63] mb-3"
          />

          {/* Items List */}
          <View className="divide-y divide-[#E2E8D8]">
            {draft.items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product) return null;
              return (
                <View key={item.productId} className="flex-row items-center py-2.5">
                  <Text className="text-xl mr-2">{product.icon || "📦"}</Text>
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-bold text-[#14221B]" numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text className="text-[10px] text-[#5C6E63]">
                      {item.reason || "Festival Essential"} · {money(product.price)} each
                    </Text>
                  </View>

                  {/* Quantity Stepper */}
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => editItem(item.productId, -1)}
                      activeOpacity={0.7}
                      className="h-7 w-7 rounded-lg bg-[#FAF8F5] border border-[#E2E8D8] items-center justify-center"
                    >
                      <MaterialIcons name="remove" size={14} color="#14221B" />
                    </TouchableOpacity>
                    <Text className="w-6 text-center text-xs font-black text-[#14221B]">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => editItem(item.productId, 1)}
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
                      <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Add Products Manually */}
          <View className="mt-4 pt-3 border-t border-[#E2E8D8]">
            <Text className="text-[10px] font-black uppercase tracking-wider text-[#5C6E63] mb-2">
              Add More Products from Store Catalog:
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {products
                .filter((p) => p.stock > 0 && !draft.items.some((i) => i.productId === p.id))
                .slice(0, 12)
                .map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => addProduct(product)}
                    activeOpacity={0.7}
                    className="flex-row items-center px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E2E8D8]"
                  >
                    <Text className="text-xs mr-1">{product.icon || "📦"}</Text>
                    <Text className="text-[11px] font-bold text-[#14221B]">
                      + {product.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="mt-5 space-y-2">
            <TouchableOpacity
              onPress={publish}
              activeOpacity={0.82}
              className="rounded-xl bg-[#176B45] py-3 items-center"
            >
              <Text className="text-xs font-black text-white">
                🚀 Publish Live for Customers
              </Text>
            </TouchableOpacity>

            {festivalBasket?.published && (
              <TouchableOpacity
                onPress={unpublish}
                activeOpacity={0.7}
                className="rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] py-2.5 items-center"
              >
                <Text className="text-xs font-bold text-[#5C6E63]">
                  Hide / Unpublish Current Basket
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
