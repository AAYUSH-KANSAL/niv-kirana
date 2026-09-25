import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { money, useNivStore } from "@/lib/niv-store";
import { uploadCreditDocumentToSupabase } from "@/lib/supabase-service";
import { trpc } from "@/lib/trpc";
import {
  creditVerificationMissingSteps,
  isCreditVerificationReady,
} from "@/shared/credit-verification";

import { compressImageUnder60Kb } from "@/lib/image-compressor";

type DocumentPhoto = {
  uri: string;
  base64: string;
  mimeType?: string | null;
  sizeKb: number;
};
type CapturedLocation = { latitude: number; longitude: number; capturedAt: string };

/**
 * Compresses document photo strictly to under 50 KB (typically 20KB - 40KB)
 * before uploading to Supabase.
 */
async function compressDocumentPhoto(asset: ImagePicker.ImagePickerAsset): Promise<DocumentPhoto> {
  const comp = await compressImageUnder60Kb(asset.uri, { maxKb: 48, initialWidth: 720 });
  return {
    uri: comp.uri,
    base64: comp.base64,
    mimeType: comp.mimeType,
    sizeKb: comp.sizeKb,
  };
}

export default function CreditVerificationScreen() {
  const router = useRouter();
  const { customer, credit, syncAllDataFromCloud, submitCreditVerification, updateCustomer } = useNivStore();
  const uploadDocument = trpc.niv.uploadCreditDocument.useMutation();

  const [requestedLimit, setRequestedLimit] = useState("2000");
  const [maskedIdLastFour, setMaskedIdLastFour] = useState("");
  const [frontPhoto, setFrontPhoto] = useState<DocumentPhoto | null>(null);
  const [backPhoto, setBackPhoto] = useState<DocumentPhoto | null>(null);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [address, setAddress] = useState(customer.address || "");
  const [consented, setConsented] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<{ url: string; title: string } | null>(null);

  // Sync latest cloud data on mount to ensure fresh status from Supabase
  useEffect(() => {
    void syncAllDataFromCloud();
  }, [syncAllDataFromCloud]);

  const limit = Math.round(Number(requestedLimit));
  const missingSteps = useMemo(
    () =>
      creditVerificationMissingSteps({
        requestedLimit: limit,
        phone: customer.phone,
        maskedIdLastFour,
        hasFrontDocument: Boolean(frontPhoto),
        hasBackDocument: Boolean(backPhoto),
        hasLocation: Boolean(location),
        consented,
      }),
    [backPhoto, consented, customer.phone, frontPhoto, limit, location, maskedIdLastFour]
  );

  const chooseDocumentPhoto = async (
    side: "front" | "back",
    source: "camera" | "library"
  ) => {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission",
          "Document photo लेने के लिए camera permission allow करें।"
        );
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.25, // Native camera compression for small KB size
        allowsEditing: false,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.25, // Native library compression for small KB size
        allowsEditing: false,
      });
    }
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const compressed = await compressDocumentPhoto(asset);

    if (side === "front") setFrontPhoto(compressed);
    else setBackPhoto(compressed);
    setSubmitError("");
  };

  const captureLocation = async () => {
    setLocating(true);
    try {
      if (!(await Location.hasServicesEnabledAsync())) {
        Alert.alert(
          "Location unavailable",
          "Phone की location service चालू करें, फिर दोबारा try करें।"
        );
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location permission",
          "Credit review के लिए आपकी one-time current location की permission जरूरी है।"
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = Number(current.coords.latitude.toFixed(6));
      const lng = Number(current.coords.longitude.toFixed(6));
      setLocation({
        latitude: lat,
        longitude: lng,
        capturedAt: new Date().toISOString(),
      });
      setSubmitError("");

      // Automatic Reverse Geocoding to complete address
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });
        if (results && results.length > 0) {
          const item = results[0];
          const parts = [
            item.name,
            item.street,
            item.subregion || item.district,
            item.city,
            item.region,
            item.postalCode,
          ].filter(Boolean);
          const autoAddress = parts.join(", ");
          if (autoAddress) {
            setAddress(autoAddress);
          }
        }
      } catch (geoErr) {
        console.warn("Reverse geocode failed:", geoErr);
      }
    } catch {
      Alert.alert(
        "Location unavailable",
        "Current location नहीं मिल सकी। खुले स्थान या बेहतर network के साथ फिर try करें।"
      );
    } finally {
      setLocating(false);
    }
  };

  const submitRequest = async () => {
    if (missingSteps.length) {
      setSubmitError(`Submit करने से पहले यह पूरा करें: ${missingSteps.join(", ")}.`);
      return;
    }
    if (!frontPhoto || !backPhoto || !location) return;
    setSubmitError("");
    setSubmitting(true);
    try {
      // Upload directly to Supabase Storage (credit-documents bucket) with trpc Supabase router fallback
      const uploadSingleDoc = async (side: "front" | "back", photo: DocumentPhoto) => {
        try {
          return await uploadCreditDocumentToSupabase({
            side,
            uri: photo.uri,
            base64: photo.base64,
            mimeType: "image/jpeg",
          });
        } catch (supabaseErr) {
          console.warn("Direct Supabase storage upload failed, trying router upload:", supabaseErr);
          const res = await uploadDocument.mutateAsync({
            side,
            imageDataUrl: `data:${photo.mimeType ?? "image/jpeg"};base64,${photo.base64}`,
          });
          return res.imageUrl;
        }
      };

      const [frontUrl, backUrl] = await Promise.all([
        uploadSingleDoc("front", frontPhoto),
        uploadSingleDoc("back", backPhoto),
      ]);

      const draft = {
        requestedLimit: limit,
        phone: customer.phone.replace(/\D/g, ""),
        maskedIdLastFour,
        frontDocumentUrl: frontUrl,
        backDocumentUrl: backUrl,
        latitude: location.latitude,
        longitude: location.longitude,
        address: address.trim() || undefined,
        locationCapturedAt: location.capturedAt,
        consentedAt: new Date().toISOString(),
      };
      if (!isCreditVerificationReady(draft)) {
        throw new Error("Verification details are incomplete");
      }
      submitCreditVerification(draft);

      // Also persist address into customer profile if provided
      if (address.trim()) {
        updateCustomer({
          ...customer,
          address: address.trim(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
      }

      Alert.alert(
        "Verification submitted",
        "Aapki NIV Credit request owner review ke liye bhej di gayi hai। Store owner ke approve karte hi credit activate ho jayega।",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.warn(
        "[Credit verification] submission failed",
        error instanceof Error ? error.message : "unknown"
      );
      setSubmitError(
        "Document upload या request save नहीं हो सकी। Internet check करके फिर Submit दबाएं; photos और location दोबारा भरने की जरूरत नहीं है।"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // READ-ONLY SUBMITTED / VERIFIED DETAILS (Anti-Tamper / Fraud Prevention)
  // ─────────────────────────────────────────────────────────────────────────────
  const renderVerifiedDetails = (isApproved: boolean) => {
    const maskedId =
      credit.verification?.maskedIdLastFour ||
      (isApproved ? "1234" : "••••");
    const frontUrl = credit.verification?.frontDocumentUrl;
    const backUrl = credit.verification?.backDocumentUrl;
    const lat = credit.verification?.latitude || customer.location?.latitude;
    const lng = credit.verification?.longitude || customer.location?.longitude;
    const userAddress =
      customer.address || credit.verification?.address || "Kuchesar Road Chaupala";

    return (
      <View className="space-y-3 mt-4">
        {/* Security & Lock Banner */}
        <View className="rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] p-3.5 flex-row items-start">
          <MaterialIcons name="security" size={20} color="#176B45" />
          <View className="flex-1 ml-2.5">
            <Text className="text-xs font-black uppercase tracking-wider text-[#176B45]">
              {isApproved ? "Verified & Locked Details" : "Submitted Details (Locked)"}
            </Text>
            <Text className="text-xs text-[#495A50] mt-0.5 leading-4">
              {isApproved
                ? "Aadhaar aur verification details verified hain. Security aur fraud prevention guidelines ke tahat ye locked hain aur edit nahi ki ja sakti."
                : "Aapke documents aur details verification ke liye submit hain. Security ke tahat ye locked hain aur review ke dauran edit nahi ki ja sakti."}
            </Text>
          </View>
        </View>

        {/* Identity & Aadhaar Card */}
        <View className="rounded-2xl bg-surface border border-border p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <MaterialIcons name="badge" size={18} color="#176B45" />
              <Text className="text-xs font-black text-foreground ml-1.5">
                Identity Proof (Masked Aadhaar)
              </Text>
            </View>
            <View className="px-2.5 py-0.5 rounded-full bg-[#EFF7E2] border border-[#CFE6B6] flex-row items-center">
              <MaterialIcons name="check-circle" size={12} color="#176B45" />
              <Text className="text-[10px] font-black text-[#176B45] ml-1">
                {isApproved ? "Verified ✓" : "Submitted"}
              </Text>
            </View>
          </View>

          <Text className="text-base font-black text-foreground tracking-wider">
            •••• •••• {maskedId}
          </Text>
          <Text className="text-[11px] text-muted mt-0.5">
            UIDAI guidelines ke anusaar safe masked ID
          </Text>

          {/* Photo Previews */}
          {frontUrl || backUrl ? (
            <View className="flex-row gap-2 mt-3">
              {frontUrl ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setPhotoPreview({
                      url: frontUrl,
                      title: "Aadhaar Front Document",
                    })
                  }
                  className="flex-1 rounded-xl overflow-hidden border border-[#CFE6B6] bg-background"
                >
                  <Image
                    source={{ uri: frontUrl }}
                    style={{ width: "100%", height: 100 }}
                    resizeMode="cover"
                  />
                  <View className="p-1.5 bg-[#EFF7E2] flex-row items-center justify-center">
                    <MaterialIcons name="zoom-in" size={13} color="#176B45" />
                    <Text className="text-[10px] font-black text-[#176B45] ml-1">
                      Front (Tap to zoom)
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {backUrl ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setPhotoPreview({
                      url: backUrl,
                      title: "Aadhaar Back Document",
                    })
                  }
                  className="flex-1 rounded-xl overflow-hidden border border-[#CFE6B6] bg-background"
                >
                  <Image
                    source={{ uri: backUrl }}
                    style={{ width: "100%", height: 100 }}
                    resizeMode="cover"
                  />
                  <View className="p-1.5 bg-[#EFF7E2] flex-row items-center justify-center">
                    <MaterialIcons name="zoom-in" size={13} color="#176B45" />
                    <Text className="text-[10px] font-black text-[#176B45] ml-1">
                      Back (Tap to zoom)
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View className="mt-2.5 px-3 py-2 rounded-xl bg-[#F8F9FA] border border-[#E9ECEF]">
              <Text className="text-xs text-muted font-bold">
                Direct verification by store owner
              </Text>
            </View>
          )}
        </View>

        {/* Address & GPS Location Card */}
        <View className="rounded-2xl bg-surface border border-border p-4">
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <MaterialIcons name="location-on" size={18} color="#176B45" />
              <Text className="text-xs font-black text-foreground ml-1.5">
                Verified Delivery Location & Address
              </Text>
            </View>
            <View className="px-2 py-0.5 rounded-full bg-[#EFF7E2] border border-[#CFE6B6]">
              <Text className="text-[10px] font-black text-[#176B45]">Locked</Text>
            </View>
          </View>

          <Text className="text-xs font-semibold text-foreground leading-4 mt-1">
            {userAddress}
          </Text>

          {lat && lng ? (
            <View className="flex-row items-center justify-between mt-2.5 bg-[#EFF7E2] px-3 py-2 rounded-xl border border-[#CFE6B6]">
              <View className="flex-row items-center flex-1 mr-2">
                <MaterialIcons name="my-location" size={14} color="#176B45" />
                <Text className="text-[11px] font-bold text-[#176B45] ml-1.5" numberOfLines={1}>
                  GPS: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                  void Linking.openURL(url);
                }}
                className="flex-row items-center bg-white px-2 py-1 rounded-lg border border-[#CFE6B6]"
              >
                <MaterialIcons name="map" size={12} color="#176B45" />
                <Text className="text-[10px] font-black text-[#176B45] ml-1">
                  Open Map
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Registered Phone */}
        <View className="rounded-2xl bg-surface border border-border p-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MaterialIcons name="phone" size={16} color="#74847A" />
            <View className="ml-2">
              <Text className="text-[10px] font-bold text-muted uppercase">Registered Phone</Text>
              <Text className="text-xs font-black text-foreground">{customer.phone}</Text>
            </View>
          </View>
          <View className="px-2 py-0.5 rounded-md bg-[#EFF7E2] border border-[#CFE6B6]">
            <Text className="text-[10px] font-black text-[#176B45]">Verified</Text>
          </View>
        </View>
      </View>
    );
  };

  // Full-screen Image Preview Modal
  const imagePreviewModal = (
    <Modal
      visible={Boolean(photoPreview)}
      transparent
      animationType="fade"
      onRequestClose={() => setPhotoPreview(null)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View className="w-full flex-row justify-between items-center mb-3">
          <Text className="text-base font-extrabold text-white">
            {photoPreview?.title || "Document Preview"}
          </Text>
          <TouchableOpacity
            onPress={() => setPhotoPreview(null)}
            className="h-9 w-9 rounded-full bg-white/20 items-center justify-center"
          >
            <MaterialIcons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {photoPreview?.url ? (
          <Image
            source={{ uri: photoPreview.url }}
            style={{ width: "100%", height: 380 }}
            resizeMode="contain"
          />
        ) : null}

        <TouchableOpacity
          onPress={() => setPhotoPreview(null)}
          className="mt-6 px-6 py-2.5 rounded-full bg-white/20"
        >
          <Text className="text-xs font-bold text-white">Close Preview</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. APPROVED CREDIT VIEW: User already has Active Khata
  // ─────────────────────────────────────────────────────────────────────────────
  if (credit.status === "approved") {
    const available = Math.max(0, credit.limit - credit.used);
    const used = credit.used || 0;
    const total = credit.limit || 0;
    const progressPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

    return (
      <ScreenContainer className="px-4">
        {imagePreviewModal}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Top Header */}
          <View className="pt-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                className="h-10 w-10 rounded-xl bg-surface border border-border items-center justify-center mr-3"
              >
                <MaterialIcons name="arrow-back" size={21} color="#176B45" />
              </TouchableOpacity>
              <View>
                <Text className="text-xs font-bold tracking-widest text-primary">
                  NIV KHATA
                </Text>
                <Text className="text-2xl font-extrabold text-foreground mt-0.5">
                  My Credit Khata
                </Text>
              </View>
            </View>
            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
              <View className="w-2 h-2 rounded-full bg-[#059669] mr-1.5" />
              <Text className="text-xs font-black text-[#047857]">Active</Text>
            </View>
          </View>

          {/* Main Khata Balance Card */}
          <View className="rounded-3xl bg-[#176B45] p-5 mt-4 shadow-sm">
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-xs font-bold uppercase tracking-wider text-[#CFE6B6]">
                  Available Khata Balance (बचा हुआ बैलेंस)
                </Text>
                <Text className="text-3xl font-black text-white mt-1">
                  {money(available)}
                </Text>
              </View>
              <View className="h-10 w-10 rounded-2xl bg-[#294737] items-center justify-center">
                <MaterialIcons name="account-balance-wallet" size={22} color="#CFE6B6" />
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 rounded-full bg-[#294737] overflow-hidden mt-4">
              <View
                className="h-full rounded-full bg-[#CFE6B6]"
                style={{ width: `${Math.max(0, 100 - progressPercent)}%` }}
              />
            </View>

            {/* Breakdown Row */}
            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-[#294737]">
              <View>
                <Text className="text-[10px] uppercase font-bold text-[#CFE6B6]">Approved Lifetime Limit</Text>
                <Text className="text-sm font-black text-white mt-0.5">{money(total)}</Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase font-bold text-[#CFE6B6]">Used Dues</Text>
                <Text className="text-sm font-black text-white mt-0.5">{money(used)}</Text>
              </View>
            </View>
          </View>

          {/* How to use */}
          <View className="rounded-2xl bg-surface border border-border p-3 mt-3 flex-row items-center">
            <MaterialIcons name="shopping-bag" size={18} color="#176B45" />
            <Text className="text-xs text-muted font-medium ml-2 flex-1">
              Yeh aapki <Text className="font-bold text-foreground">Lifetime Limit</Text> hai. Limit khatam hone par store owner se dues clear karwake dobara limit enable karwayein.
            </Text>
          </View>

          {/* Read-Only Verified Documents & Identity */}
          {renderVerifiedDetails(true)}

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={() => router.push("/" as never)}
            activeOpacity={0.85}
            className="rounded-2xl bg-primary py-4 items-center mt-6 flex-row justify-center shadow-sm"
          >
            <MaterialIcons name="storefront" size={20} color="#FFF9EF" />
            <Text className="ml-2 text-base font-extrabold text-background">
              Shop with NIV Khata (खरीदारी करें)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/orders" as never)}
            activeOpacity={0.85}
            className="rounded-2xl bg-surface border border-border py-3.5 items-center mt-2.5 flex-row justify-center"
          >
            <MaterialIcons name="receipt-long" size={18} color="#176B45" />
            <Text className="ml-2 text-sm font-bold text-foreground">
              View My Orders & Khata Bills
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UNDER REVIEW VIEW: User submitted, waiting for store owner approval
  // ─────────────────────────────────────────────────────────────────────────────
  if (credit.status === "requested") {
    const requested = credit.requestedLimit || credit.limit || 2000;

    return (
      <ScreenContainer className="px-4">
        {imagePreviewModal}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="pt-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                accessibilityLabel="Go back"
                className="h-10 w-10 rounded-xl bg-surface border border-border items-center justify-center mr-3"
              >
                <MaterialIcons name="arrow-back" size={21} color="#176B45" />
              </TouchableOpacity>
              <View>
                <Text className="text-xs font-bold tracking-widest text-primary">
                  NIV KHATA
                </Text>
                <Text className="text-2xl font-extrabold text-foreground mt-0.5">
                  Verification Status
                </Text>
              </View>
            </View>
            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-[#FFF7ED] border border-[#FED7AA]">
              <View className="w-2 h-2 rounded-full bg-[#C2410C] mr-1.5" />
              <Text className="text-xs font-black text-[#C2410C]">Under Review</Text>
            </View>
          </View>

          {/* Under Review Card */}
          <View className="rounded-3xl bg-[#FFF7ED] border border-[#FED7AA] p-5 mt-4">
            <View className="flex-row items-center">
              <View className="h-11 w-11 rounded-2xl bg-[#FFEDD5] items-center justify-center">
                <MaterialIcons name="hourglass-top" size={24} color="#C2410C" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-black text-[#9A3412]">
                  Dukandar ke Review ke liye Submit Hai
                </Text>
                <Text className="text-xs text-[#9A3412] mt-0.5 font-bold">
                  Requested Limit: {money(requested)}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-[#7C2D12] mt-3 leading-4">
              Aapki NIV Khata credit request safaltapoorvak submit ho chuki hai. Dukan malik ke verification karte hi aapka Khata activate kar diya jayega.
            </Text>
          </View>

          {/* Read-Only Submitted Details Preview */}
          {renderVerifiedDetails(false)}

          {/* Action Button */}
          <TouchableOpacity
            onPress={() => router.replace("/orders" as never)}
            activeOpacity={0.85}
            className="rounded-2xl bg-surface border border-border py-4 items-center mt-6 flex-row justify-center"
          >
            <MaterialIcons name="arrow-back" size={18} color="#176B45" />
            <Text className="ml-2 text-sm font-bold text-foreground">
              Back to Orders
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. APPLICATION FORM: User has status "none" or "declined" (Fresh Application)
  // ─────────────────────────────────────────────────────────────────────────────
  const documentBox = (side: "front" | "back", photo: DocumentPhoto | null) => (
    <View className="rounded-3xl border border-border bg-surface p-4 mt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-foreground">
            Masked ID — {side === "front" ? "front" : "back"}
          </Text>
          <Text className="text-xs leading-5 text-muted mt-1">
            Full Aadhaar number न दिखाएं; masked copy ही upload करें।
          </Text>
        </View>
        <MaterialIcons
          name={photo ? "check-circle" : "badge"}
          size={22}
          color={photo ? "#176B45" : "#74847A"}
        />
      </View>
      {photo ? (
        <>
          <Image
            source={{ uri: photo.uri }}
            resizeMode="cover"
            className="h-36 w-full rounded-2xl bg-background mt-4"
          />
          <View className="flex-row items-center mt-2">
            <MaterialIcons name="verified" size={14} color="#176B45" />
            <Text className="text-xs font-bold text-primary ml-1">
              Compressed photo ready · {photo.sizeKb} KB (Under 50 KB ✓)
            </Text>
          </View>
        </>
      ) : (
        <Text className="text-xs font-bold text-warning mt-3">
          Photo अभी add नहीं हुई है (Auto-compressed in KBs)
        </Text>
      )}
      <View className="flex-row mt-4">
        <TouchableOpacity
          onPress={() => void chooseDocumentPhoto(side, "camera")}
          className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary py-3 mr-2"
        >
          <MaterialIcons name="photo-camera" size={17} color="#FFF9EF" />
          <Text className="ml-2 text-xs font-bold text-background">Click photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void chooseDocumentPhoto(side, "library")}
          className="flex-1 flex-row items-center justify-center rounded-2xl border border-primary bg-background py-3"
        >
          <MaterialIcons name="photo-library" size={17} color="#176B45" />
          <Text className="ml-2 text-xs font-bold text-primary">Upload</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const needsAttention = missingSteps.length > 0 || Boolean(submitError);

  return (
    <ScreenContainer className="px-4">
      {imagePreviewModal}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="pt-2 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            className="h-10 w-10 rounded-xl bg-surface border border-border items-center justify-center mr-3"
          >
            <MaterialIcons name="arrow-back" size={21} color="#176B45" />
          </TouchableOpacity>
          <View>
            <Text className="text-xs font-bold tracking-widest text-primary">
              NIV CREDIT
            </Text>
            <Text className="text-2xl font-extrabold text-foreground mt-1">
              Credit verification
            </Text>
          </View>
        </View>

        {/* If previous request was declined or reset by admin */}
        {credit.status === "declined" && (
          <View className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] p-3.5 mt-4 flex-row items-start">
            <MaterialIcons name="info-outline" size={18} color="#DC2626" />
            <View className="flex-1 ml-2">
              <Text className="text-xs font-black text-[#991B1B]">
                Previous Request Reset / Declined
              </Text>
              <Text className="text-xs text-[#7F1D1D] mt-0.5 leading-4">
                Store owner ne aapki pichli credit request ko reset kar diya hai. Aap niche fresh application submit kar sakte hain.
              </Text>
            </View>
          </View>
        )}

        <Text className="text-sm font-extrabold text-foreground mt-5">
          Requested credit limit
        </Text>
        <TextInput
          value={requestedLimit}
          onChangeText={setRequestedLimit}
          keyboardType="number-pad"
          placeholder="₹ 2000"
          placeholderTextColor="#74847A"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground mt-2"
        />

        <View className="rounded-2xl bg-surface border border-border p-4 mt-3">
          <Text className="text-[11px] font-bold tracking-wider text-muted">
            REGISTERED PHONE
          </Text>
          <Text className="text-base font-extrabold text-foreground mt-1">
            {customer.phone || "Add phone in Account"}
          </Text>
          <Text className="text-xs text-muted mt-1">
            Owner इसी number पर call करके credit request confirm कर सकता है।
          </Text>
        </View>

        <Text className="text-sm font-extrabold text-foreground mt-6">
          Masked Aadhaar last 4 digits
        </Text>
        <TextInput
          value={maskedIdLastFour}
          onChangeText={(value) =>
            setMaskedIdLastFour(value.replace(/\D/g, "").slice(0, 4))
          }
          keyboardType="number-pad"
          maxLength={4}
          placeholder="e.g. 1234"
          placeholderTextColor="#74847A"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground mt-2"
        />

        {documentBox("front", frontPhoto)}
        {documentBox("back", backPhoto)}

        {/* Location & Complete Address Card */}
        <View className="rounded-3xl bg-surface border border-border p-4 mt-5">
          <View className="flex-row items-start">
            <View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] items-center justify-center">
              <MaterialIcons name="my-location" size={20} color="#176B45" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-sm font-extrabold text-foreground">
                One-time Location & Complete Address
              </Text>
              <Text className="text-xs leading-5 text-muted mt-1">
                Credit review aur delivery ke liye exact address aur location zaroori hai.
              </Text>
            </View>
          </View>

          {location ? (
            <View className="mt-3 flex-row items-center px-3 py-2 rounded-xl bg-[#EFF7E2] border border-[#CFE6B6]">
              <MaterialIcons name="check-circle" size={16} color="#176B45" />
              <Text className="text-xs font-bold text-[#176B45] ml-1.5 flex-1">
                GPS captured · {location.latitude}, {location.longitude}
              </Text>
            </View>
          ) : (
            <Text className="text-xs font-bold text-warning mt-3">
              GPS location अभी capture नहीं हुई है
            </Text>
          )}

          <TouchableOpacity
            onPress={() => void captureLocation()}
            disabled={locating}
            className="rounded-2xl bg-background border border-primary py-3 items-center mt-3"
          >
            <Text className="text-sm font-bold text-primary">
              {locating
                ? "Capturing location & address..."
                : location
                ? "Update GPS & Auto-fetch address"
                : "Capture current location (Auto-fetch)"}
            </Text>
          </TouchableOpacity>

          {/* Complete Address Text Box (Automatic GPS + Manual Edit) */}
          <View className="mt-4 pt-3 border-t border-border">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-extrabold text-foreground">
                Complete Address (पूरा पता)
              </Text>
              <Text className="text-[11px] font-semibold text-primary">
                Automatic / Type
              </Text>
            </View>
            <Text className="text-xs text-muted mt-1">
              मकान नं., गली/मोहल्ला, लैंडमार्क, गांव/शहर (Automatic GPS se aayega ya manually type karein):
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              placeholder="मकान नं., गली/मोहल्ला, लैंडमार्क, गांव/शहर (e.g. Near Shiv Mandir, Kuchesar Road Chopla)"
              placeholderTextColor="#74847A"
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground mt-2 min-h-[76px]"
              style={{ textAlignVertical: "top" }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setConsented((value) => !value);
            setSubmitError("");
          }}
          activeOpacity={0.8}
          className="flex-row items-start rounded-2xl bg-surface border border-border p-4 mt-5"
        >
          <MaterialIcons
            name={consented ? "check-box" : "check-box-outline-blank"}
            size={22}
            color={consented ? "#176B45" : "#74847A"}
          />
          <Text className="flex-1 text-xs leading-5 text-foreground ml-3">
            मैं NIV Credit review के लिए masked document photos, registered phone, full address और one-time location submit करने की सहमति देता/देती हूँ।
          </Text>
        </TouchableOpacity>

        <View
          className={`rounded-2xl border p-3 mt-4 ${
            needsAttention
              ? "bg-[#FFF1E9] border-[#F2D0C8]"
              : "bg-[#EFF7E2] border-[#CFE6B6]"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              needsAttention ? "text-error" : "text-primary"
            }`}
          >
            {submitError ||
              (missingSteps.length
                ? `बाकी steps: ${missingSteps.join(" · ")}`
                : "All steps complete — submit करने के लिए ready")}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void submitRequest()}
          disabled={submitting}
          className={`rounded-2xl py-4 items-center mt-5 ${
            submitting ? "bg-muted" : "bg-primary"
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF9EF" />
          ) : (
            <Text className="text-base font-extrabold text-background">
              {missingSteps.length
                ? "Complete steps above"
                : "Submit credit verification"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
