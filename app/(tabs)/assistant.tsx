import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { PublishedFestivalBasket } from "@/components/published-festival-basket";
import { ScreenContainer } from "@/components/screen-container";
import { useNivStore } from "@/lib/niv-store";

export default function AssistantScreen() {
  const router = useRouter();
  const { festivalBasket } = useNivStore();

  const isPublished = Boolean(festivalBasket?.published && (festivalBasket?.items?.length ?? 0) > 0);

  return (
    <ScreenContainer className="px-4">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header Section */}
        <View className="pt-2">
          <View className="h-12 w-12 rounded-2xl bg-[#EAF4D9] items-center justify-center">
            <MaterialIcons name="auto-awesome" size={24} color="#176B45" />
          </View>
          <Text className="text-2xl font-black text-[#14221B] mt-4">
            NIV AI Festive Pick
          </Text>
          <Text className="text-xs leading-5 text-[#5C6E63] mt-1.5">
            त्यौहार और खास मौकों के लिए NIV Kirana के विशेष combo packs। Items और quantity अपनी पसंद अनुसार customize करके एक साथ cart में जोड़ें।
          </Text>
        </View>

        {/* Live Published Basket or Placeholder */}
        {isPublished ? (
          <PublishedFestivalBasket />
        ) : (
          <View className="rounded-3xl bg-white border border-[#E2E8D8] p-6 mt-6 items-center shadow-sm">
            <View className="h-16 w-16 rounded-full bg-[#EAF4D9] items-center justify-center mb-3">
              <MaterialIcons name="celebration" size={32} color="#176B45" />
            </View>
            <Text className="text-base font-black text-[#14221B] text-center">
              New Festive Basket Coming Soon
            </Text>
            <Text className="text-xs text-[#5C6E63] text-center mt-2 leading-5 px-3">
              Store owner जल्द ही special festival combo live करेंगे। Regular grocery essentials देखने के लिए Store Catalog browse करें।
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)")}
              activeOpacity={0.85}
              className="flex-row items-center px-6 py-3 rounded-2xl bg-[#176B45] mt-5"
            >
              <MaterialIcons name="storefront" size={18} color="#FFFFFF" />
              <Text className="ml-2 text-xs font-black text-white">
                Browse Store Products
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
