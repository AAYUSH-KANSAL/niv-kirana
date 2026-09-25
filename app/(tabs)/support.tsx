import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { VoiceOrderRecorder } from "@/components/voice-order-recorder";
import { useNivStore } from "@/lib/niv-store";
import { buildStoreContactLinks } from "@/shared/store-contact";

export default function SupportScreen() {
  const { customer, settings, addVoiceOrder } = useNivStore();
  const links = buildStoreContactLinks(settings.phone, settings.whatsapp, customer.phone, settings.storeName);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`${title}: ${msg}`);
      }
    } else {
      Alert.alert(title, msg);
    }
  };

  const openContact = async (url: string | null, unavailableMessage: string) => {
    if (!url) {
      showAlert("Contact unavailable", unavailableMessage);
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showAlert("Contact unavailable", unavailableMessage);
        return;
      }
      await Linking.openURL(url);
    } catch {
      showAlert("Contact unavailable", unavailableMessage);
    }
  };

  const submitVoiceOrder = async (audioUri: string) => {
    let cloudAudioUri = audioUri;
    try {
      const { uploadVoiceAudioToSupabase } = await import("@/lib/supabase-service");
      cloudAudioUri = await uploadVoiceAudioToSupabase(audioUri);
    } catch (e) {
      console.warn("Upload voice audio fallback:", e);
    }

    const order = addVoiceOrder(cloudAudioUri);
    if (!order) {
      Alert.alert(
        "Voice Order unavailable",
        "पहले customer account में sign in करें, फिर voice order भेजें।"
      );
      return;
    }
    Alert.alert(
      "Voice Order Bheja Gaya!",
      "Aapka voice order dukan par pahunch chuka hai. Dukandar recording sunkar bill amount set karenge aur aapko Orders tab mein live bill dikhai dega."
    );
  };

  return (
    <ScreenContainer className="px-4" containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Header */}
        <View className="pt-2 pb-2">
          <View className="flex-row items-center">
            <View className="h-2 w-2 rounded-full bg-primary mr-1.5" />
            <Text className="text-[10px] font-black tracking-widest text-primary uppercase">
              {settings.storeName ? `${settings.storeName} Order Hub` : "Order Hub"}
            </Text>
          </View>
          <Text className="text-2xl font-black text-foreground tracking-tight mt-1">
            Order Your Way
          </Text>
          <Text className="text-xs text-muted mt-0.5 leading-5">
            Voice message, WhatsApp ya direct phone call—jaise aasan lage, waise ration mangwayein.
          </Text>
        </View>

        {/* Action Cards Container */}
        <View className="rounded-[32px] bg-[#EAF4D9] border border-[#CFE6B6] p-4 mt-3 shadow-sm">
          {/* Card 1: Voice Order Recorder */}
          <View className="rounded-3xl bg-background border border-[#E2E8D8] p-4 shadow-sm">
            <View className="flex-row items-start">
              <View className="h-12 w-12 rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center">
                <MaterialIcons name="keyboard-voice" size={24} color="#176B45" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-black text-foreground">
                  Voice Order
                </Text>
                <Text className="text-xs leading-5 text-muted mt-0.5">
                  Samaan aur quantity bole, recording sunein, aur order bhej dein.
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <VoiceOrderRecorder onReady={submitVoiceOrder} />
            </View>
          </View>

          {/* Card 2: WhatsApp Order */}
          <View className="rounded-3xl bg-background border border-[#E2E8D8] p-4 mt-3.5 shadow-sm">
            <View className="flex-row items-start">
              <View className="h-12 w-12 rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center">
                <FontAwesome name="whatsapp" size={24} color="#176B45" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-black text-foreground">
                  WhatsApp Order
                </Text>
                <Text className="text-xs leading-5 text-muted mt-0.5">
                  Direct store WhatsApp par grocery list bhej kar order karein.
                </Text>
                <Text className="text-xs font-bold text-[#176B45] mt-1.5">
                  +91 {settings.whatsapp}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityLabel="Direct WhatsApp order"
              onPress={() =>
                void openContact(
                  links.whatsappUrl,
                  "WhatsApp number ya app uplabdh nahi hai."
                )
              }
              activeOpacity={0.85}
              style={{
                backgroundColor: "#176B45",
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 14,
                elevation: 3,
                shadowColor: "#176B45",
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                overflow: "hidden",
              }}
            >
              <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: "#FFFFFF",
                  marginLeft: 8,
                  marginRight: 6,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                Open WhatsApp (+91 {settings.whatsapp})
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={17}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {/* Card 3: Direct Phone Call */}
          <View className="rounded-3xl bg-background border border-[#E2E8D8] p-4 mt-3.5 shadow-sm">
            <View className="flex-row items-start">
              <View className="h-12 w-12 rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center">
                <MaterialIcons name="call" size={24} color="#176B45" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-base font-black text-foreground">
                  Call to Order
                </Text>
                <Text className="text-xs leading-5 text-muted mt-0.5">
                  Kirana store par direct call karke apna order confirm karein.
                </Text>
                <Text className="text-xs font-bold text-[#176B45] mt-1.5">
                  +91 {settings.phone}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityLabel="Call store to order"
              onPress={() =>
                void openContact(
                  links.callUrl,
                  "Shop phone number ya calling app uplabdh nahi hai."
                )
              }
              activeOpacity={0.85}
              style={{
                backgroundColor: "#176B45",
                borderRadius: 16,
                paddingVertical: 14,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 14,
                elevation: 3,
                shadowColor: "#176B45",
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                overflow: "hidden",
              }}
            >
              <MaterialIcons name="call" size={18} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  color: "#FFFFFF",
                  marginLeft: 8,
                  marginRight: 6,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                Call Store Now (+91 {settings.phone})
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={17}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View className="rounded-3xl bg-surface border border-border p-4 mt-4 shadow-sm">
          <View className="flex-row items-center mb-1">
            <MaterialIcons name="tips-and-updates" size={17} color="#176B45" />
            <Text className="ml-1.5 text-xs font-black text-foreground uppercase tracking-wider">
              Voice Order Tips
            </Text>
          </View>
          <Text className="text-xs leading-5 text-muted mt-1 font-medium">
            Samaan ka naam, quantity aur brand saaf bole. Example:{"\n"}
            <Text className="font-bold text-foreground">
              “2 kilo Fortune atta, 1 litre Dhara mustard oil, aur 2 packet Parle-G bhej dijiye.”
            </Text>
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
