import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { STORE_CONFIG } from "@/config/app-config";
import { useNivStore } from "@/lib/niv-store";
import { signInUnified, signUpCustomer } from "@/lib/supabase-service";
import { normalizeIndianMobile } from "@/shared/local-account-rules";

export default function LoginScreen() {
  const router = useRouter();
  const {
    hydrated,
    isSignedIn,
    ownerMode,
    enterOwnerMode,
    signInWithCustomerProfile,
    settings,
  } = useNivStore();

  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginError, setLoginError] = useState("");
  const [pendingNotice, setPendingNotice] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    requestedAt: string;
  } | null>(null);

  // Safe navigation effect
  useEffect(() => {
    if (!hydrated) return;
    if (ownerMode) {
      router.replace("/admin" as never);
    } else if (isSignedIn) {
      router.replace("/" as never);
    }
  }, [hydrated, ownerMode, isSignedIn, router]);

  if (hydrated && (ownerMode || isSignedIn)) {
    return <View style={{ flex: 1, backgroundColor: "#FAF8F5" }} />;
  }

  // Handle Login (Customer or Admin)
  const handleLogin = async () => {
    const rawId = loginIdentifier.trim();
    if (!rawId) {
      const msg = "Email ya 10-digit mobile number enter karein.";
      setLoginError(msg);
      Alert.alert("Input Required", msg);
      return;
    }
    if (!loginPassword) {
      const msg = "Password enter karein.";
      setLoginError(msg);
      Alert.alert("Input Required", msg);
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      const result = await signInUnified({
        identifier: rawId,
        password: loginPassword,
      });

      if (result.role === "admin") {
        enterOwnerMode();
        router.replace("/admin" as never);
        return;
      }

      if (result.role === "customer" && result.profile) {
        signInWithCustomerProfile(result.profile);
        router.replace("/" as never);
      }
    } catch (err: any) {
      const msg = err?.message || "Login failed. Please try again.";
      setLoginError(msg);

      if (msg.includes("Approval Pending")) {
        setPendingNotice({
          phone: rawId.includes("@") ? undefined : rawId,
          email: rawId.includes("@") ? rawId : undefined,
          requestedAt: new Date().toLocaleTimeString("en-IN"),
        });
        Alert.alert(
          "Approval Pending",
          "Aapka account abhi Admin approval ke liye pending hai. Admin dwara approve hone ke baad hi aap shopping aur access kar payenge."
        );
      } else if (msg.includes("This is not registered email")) {
        Alert.alert("Email Not Found", "This is not registered email");
      } else if (msg.includes("This mobile number is not registered")) {
        Alert.alert("Mobile Not Found", "This mobile number is not registered.");
      } else if (msg.includes("Incorrect password")) {
        Alert.alert("Wrong Password", "Incorrect password. Please try again.");
      } else {
        Alert.alert("Login Failed", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Account (Customer)
  const handleCreateAccount = async () => {
    const trimmedName = name.trim();
    const cleanPhone = normalizeIndianMobile(phone);
    const cleanEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      const msg = "Apna poora naam enter karein.";
      setLoginError(msg);
      Alert.alert("Name Required", msg);
      return;
    }
    if (cleanPhone.length !== 10) {
      const msg = "Kripya valid 10-digit mobile number enter karein.";
      setLoginError(msg);
      Alert.alert("Mobile Required", msg);
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      const msg = "Kripya valid email address enter karein.";
      setLoginError(msg);
      Alert.alert("Email Required", msg);
      return;
    }
    if (!password || password.length < 6) {
      const msg = "Password kam se kam 6 characters ka hona chahiye.";
      setLoginError(msg);
      Alert.alert("Password Required", msg);
      return;
    }

    setLoading(true);
    setLoginError("");

    try {
      await signUpCustomer({
        name: trimmedName,
        phone: cleanPhone,
        email: cleanEmail,
        password,
      });

      setPendingNotice({
        name: trimmedName,
        phone: cleanPhone,
        email: cleanEmail,
        requestedAt: new Date().toLocaleTimeString("en-IN"),
      });

      Alert.alert(
        "Account Created! Visit Shop Once",
        "Visit shop for account opening once time and enjoy lifetime free! Aapka account register ho gaya hai. Dukaan par ek baar verify karwayein aur lifetime free delivery aur Khata enjoy karein."
      );

      setLoginIdentifier(cleanEmail);
      setLoginPassword(password);
      setMode("signin");
    } catch (err: any) {
      const msg = err?.message || "Account creation failed.";
      if (msg.includes("User already exists with this mobile number")) {
        Alert.alert("Mobile Exists", "User already exists with this mobile number");
        setLoginError("User already exists with this mobile number");
      } else if (msg.includes("User already exists with this email address")) {
        Alert.alert("Email Exists", "User already exists with this email address");
        setLoginError("User already exists with this email address");
      } else {
        Alert.alert("Registration Error", msg);
        setLoginError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const openWhatsAppHelp = () => {
    const targetWhatsapp = settings?.whatsapp || STORE_CONFIG.whatsapp;
    const targetName = settings?.storeName || STORE_CONFIG.name;
    const text = encodeURIComponent(
      `Namaste ${targetName}, mujhe account login ya order ke liye sahayata chahiye.`
    );
    const cleanNumber = targetWhatsapp.replace(/\D/g, "");
    const formatted =
      cleanNumber.startsWith("91") && cleanNumber.length === 12
        ? cleanNumber
        : `91${cleanNumber.slice(-10)}`;
    void Linking.openURL(`https://wa.me/${formatted}?text=${text}`);
  };

  return (
    <ScreenContainer className="px-4" containerClassName="bg-[#FAF8F5]" edges={["top", "bottom", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 14 }}
      >
        {/* ============================================================== */}
        {/* 1. BRAND HERO BANNER */}
        {/* ============================================================== */}
        <View
          style={{
            backgroundColor: "#176B45",
            borderRadius: 32,
            padding: 24,
            overflow: "hidden",
            position: "relative",
            shadowColor: "#176B45",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Subtle geometric background accents */}
          <View
            style={{
              position: "absolute",
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(0, 0, 0, 0.12)",
            }}
          />

          {/* Top Bar: Location Badge & WhatsApp Help */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            {/* Live Location Chip */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.22)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.25)",
              }}
            >
              <MaterialIcons name="location-on" size={13} color="#EAF4D9" />
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFFFFF", marginLeft: 4, letterSpacing: -0.2 }}>
                Kuchesar Road Chopla
              </Text>
            </View>

            {/* Helpline Chip */}
            <TouchableOpacity
              onPress={openWhatsAppHelp}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <MaterialIcons name="support-agent" size={14} color="#176B45" />
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#176B45", marginLeft: 4 }}>
                Help
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bold Logo & Identity */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 16,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <MaterialIcons name="local-mall" size={26} color="#176B45" />
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "900",
                    color: "#FFFFFF",
                    fontStyle: "italic",
                    letterSpacing: -1,
                    lineHeight: 36,
                  }}
                >
                  {settings?.storeName || STORE_CONFIG.name}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.9)",
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Quick Grocery Delivery
                </Text>
              </View>
            </View>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "rgba(255, 255, 255, 0.95)",
                marginTop: 12,
                lineHeight: 20,
              }}
            >
              10-15 min doorstep delivery in{" "}
              <Text style={{ fontWeight: "900", color: "#FFFFFF", textDecorationLine: "underline" }}>
                Kuchesar Road Chopla
              </Text>
            </Text>
          </View>

          {/* Quick Value Strips */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.2)",
              marginTop: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
              }}
            >
              <MaterialIcons name="flash-on" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF", marginLeft: 4 }}>
                15-Min Delivery
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.22)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
              }}
            >
              <MaterialIcons name="storefront" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontWeight: "900", color: "#FFFFFF", marginLeft: 4 }}>
                Visit Shop Once · Lifetime Free
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.16)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 12,
              }}
            >
              <MaterialIcons name="verified" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF", marginLeft: 4 }}>
                100% Shuddh
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================================== */}
        {/* 2. PENDING APPROVAL NOTICE (IF REGISTERED) */}
        {/* ============================================================== */}
        {pendingNotice && (
          <View className="rounded-[26px] bg-[#FFF8E7] border border-[#F0C97A] p-4 mt-3.5">
            <View className="flex-row items-start">
              <View className="h-9 w-9 rounded-xl bg-[#FDE293] items-center justify-center">
                <MaterialIcons name="hourglass-top" size={20} color="#8A5800" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-sm font-black text-[#6B4500]">
                  Account Approval In Progress
                </Text>
                <Text className="text-xs leading-5 text-[#8A5800] mt-0.5 font-bold">
                  Visit shop for account opening once time and enjoy lifetime free!
                </Text>
                <Text className="text-xs leading-5 text-[#8A5800] mt-0.5">
                  Dukaan (Kuchesar Road Chopla) par bas ek baar visit karein ya owner se verify karwayein aur lifetime free services ka labh uthayein.
                </Text>

                <View className="mt-2 bg-white/90 rounded-xl p-2.5 border border-[#F0C97A]/50">
                  {pendingNotice.email && (
                    <Text className="text-[11px] font-bold text-[#14221B]">
                      Email: <Text className="font-semibold text-[#5C6E63]">{pendingNotice.email}</Text>
                    </Text>
                  )}
                  {pendingNotice.phone && (
                    <Text className="text-[11px] font-bold text-[#14221B] mt-0.5">
                      Mobile: <Text className="font-semibold text-[#5C6E63]">{pendingNotice.phone}</Text>
                    </Text>
                  )}
                  <Text className="text-[10px] text-[#8A5800] mt-1">
                    Submitted: {pendingNotice.requestedAt} · Typically verified in 5-10 mins
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={openWhatsAppHelp}
                  style={{
                    backgroundColor: "#176B45",
                    borderRadius: 12,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 10,
                  }}
                >
                  <MaterialIcons name="chat" size={15} color="#FFFFFF" />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#FFFFFF", marginLeft: 6 }}>
                    Ask Store Owner on WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* 3. CLEAN AUTH CARD */}
        {/* ============================================================== */}
        <View
          style={{
            borderRadius: 30,
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: "#E2E8D8",
            padding: 20,
            marginTop: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2,
          }}
        >
          {/* Segmented Tab Pill */}
          <View
            style={{
              flexDirection: "row",
              borderRadius: 16,
              backgroundColor: "#FAF8F5",
              padding: 6,
              borderWidth: 1,
              borderColor: "#E2E8D8",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setMode("signin");
                setLoginError("");
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                paddingVertical: 10,
                backgroundColor: mode === "signin" ? "#FFFFFF" : "transparent",
                borderWidth: mode === "signin" ? 1 : 0,
                borderColor: "#CFE6B6",
                shadowColor: mode === "signin" ? "#000" : "transparent",
                shadowOpacity: mode === "signin" ? 0.08 : 0,
                shadowRadius: 4,
                elevation: mode === "signin" ? 2 : 0,
              }}
            >
              <MaterialIcons
                name="login"
                size={16}
                color={mode === "signin" ? "#176B45" : "#5C6E63"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  marginLeft: 6,
                  color: mode === "signin" ? "#176B45" : "#5C6E63",
                }}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setMode("create");
                setLoginError("");
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                paddingVertical: 10,
                backgroundColor: mode === "create" ? "#FFFFFF" : "transparent",
                borderWidth: mode === "create" ? 1 : 0,
                borderColor: "#CFE6B6",
                shadowColor: mode === "create" ? "#000" : "transparent",
                shadowOpacity: mode === "create" ? 0.08 : 0,
                shadowRadius: 4,
                elevation: mode === "create" ? 2 : 0,
              }}
            >
              <MaterialIcons
                name="person-add"
                size={16}
                color={mode === "create" ? "#176B45" : "#5C6E63"}
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "900",
                  marginLeft: 6,
                  color: mode === "create" ? "#176B45" : "#5C6E63",
                }}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Heading */}
          <View style={{ marginTop: 18, marginBottom: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#14221B", letterSpacing: -0.3 }}>
              {mode === "signin" ? "Enter your mobile or email" : "Create new customer account"}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 18, color: "#5C6E63", marginTop: 4 }}>
              {mode === "signin"
                ? "NIV Kirana Kuchesar Road Chopla me shopping ke liye login karein."
                : "Aapka naam aur phone number dalein. Turant account create hoga."}
            </Text>
          </View>

          {/* Special Lifetime Free Banner for Sign Up */}
          {mode === "create" ? (
            <View
              style={{
                borderRadius: 16,
                backgroundColor: "#EAF4D9",
                borderWidth: 1,
                borderColor: "#CFE6B6",
                padding: 12,
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 12,
                  backgroundColor: "#176B45",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <MaterialIcons name="storefront" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: "#176B45" }}>
                  Visit shop for account opening once time and enjoy lifetime free
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "500", color: "#5C6E63", marginTop: 2 }}>
                  Kuchesar Road Chopla · Ek baar account open karwayein aur lifetime free grocery delivery enjoy karein!
                </Text>
              </View>
            </View>
          ) : null}

          {/* Error Message Alert */}
          {loginError ? (
            <View
              style={{
                borderRadius: 16,
                backgroundColor: "#FEF2F2",
                borderWidth: 1,
                borderColor: "#FECACA",
                padding: 12,
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="error-outline" size={18} color="#DC2626" />
              <Text style={{ flex: 1, fontSize: 12, color: "#DC2626", fontWeight: "700", marginLeft: 8 }}>
                {loginError}
              </Text>
            </View>
          ) : null}

          {/* Form Fields */}
          {mode === "signin" ? (
            <View style={{ marginTop: 10 }}>
              <ZomatoInputField
                label="Mobile Number or Email"
                icon="phone-android"
                value={loginIdentifier}
                onChange={(val) => {
                  setLoginIdentifier(val);
                  setLoginError("");
                }}
                placeholder="10-digit mobile ya email address"
                keyboardType="email-address"
              />

              <ZomatoInputField
                label="Password"
                icon="lock-outline"
                value={loginPassword}
                onChange={(val) => {
                  setLoginPassword(val);
                  setLoginError("");
                }}
                placeholder="Password dalein"
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      size={18}
                      color="#5C6E63"
                    />
                  </TouchableOpacity>
                }
              />

              {/* Bold Action Button (Login) */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#176B45",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  marginTop: 18,
                  shadowColor: "#176B45",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#FFFFFF", marginLeft: 8 }}>
                      Continue to Store
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ marginTop: 10 }}>
              {/* Lifetime Free Banner */}
              <View
                style={{
                  borderRadius: 16,
                  backgroundColor: "#EAF4D9",
                  borderWidth: 1,
                  borderColor: "#CFE6B6",
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: 10,
                    backgroundColor: "#176B45",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <MaterialIcons name="card-giftcard" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: "#176B45" }}>
                    SPECIAL OFFER
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: "#14221B" }}>
                    Visit shop for account opening once time and enjoy lifetime free
                  </Text>
                </View>
              </View>

              <ZomatoInputField
                label="Full Name / Poora Naam"
                icon="person-outline"
                value={name}
                onChange={setName}
                placeholder="e.g. Rahul Verma"
              />

              <ZomatoInputField
                label="10-Digit Mobile Number"
                icon="phone"
                value={phone}
                onChange={(val) => {
                  setPhone(val);
                  setLoginError("");
                }}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
              />

              <ZomatoInputField
                label="Email Address"
                icon="mail-outline"
                value={email}
                onChange={(val) => {
                  setEmail(val);
                  setLoginError("");
                }}
                placeholder="e.g. rahul@gmail.com"
                keyboardType="email-address"
              />

              <ZomatoInputField
                label="Create Password (min. 6 chars)"
                icon="lock"
                value={password}
                onChange={setPassword}
                placeholder="Create a strong password"
                secureTextEntry={!showPassword}
                rightElement={
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 4 }}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      size={18}
                      color="#5C6E63"
                    />
                  </TouchableOpacity>
                }
              />

              {/* Submit Button (Sign Up) */}
              <TouchableOpacity
                onPress={handleCreateAccount}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#176B45",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  marginTop: 18,
                  shadowColor: "#176B45",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#FFFFFF", marginLeft: 8 }}>
                      Create Account & Request Approval
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Micro Legal Notice */}
          <Text style={{ fontSize: 10, textAlign: "center", color: "#5C6E63", lineHeight: 15, marginTop: 14 }}>
            By continuing, you agree to our Terms of Service, Privacy Policy and Content Policies.
          </Text>
        </View>

        {/* ============================================================== */}
        {/* 4. WHY SHOP AT NIV KIRANA (KUCHESAR ROAD CHOPLA)? */}
        {/* ============================================================== */}
        <View className="mt-6 mb-2">
          <Text className="text-base font-black text-[#14221B] tracking-tight px-1 mb-3">
            Why Shop with NIV Kirana?
          </Text>

          <View className="flex-row gap-3 mb-3">
            <ZomatoFeatureCard
              icon="delivery-dining"
              title="15-Min Delivery"
              detail="Kuchesar Road Chopla ke har gaon aur gali me tez delivery."
              badge="Fastest"
            />
            <ZomatoFeatureCard
              icon="account-balance-wallet"
              title="₹5,000 Khata"
              detail="Mahine bhar rashan lein, payment month end me karein."
              badge="0% Interest"
            />
          </View>

          <View className="flex-row gap-3">
            <ZomatoFeatureCard
              icon="price-check"
              title="Mandi Rates"
              detail="Atta, dal, tel, masale aur chini par wholesale daam."
              badge="Savings"
            />
            <ZomatoFeatureCard
              icon="chat"
              title="WhatsApp Order"
              detail="List photo ya voice note bhej kar direct dukaan se mangwayein."
              badge="Simple"
            />
          </View>
        </View>

        {/* ============================================================== */}
        {/* 5. COMMUNITY TRUST & LOCATION FOOTER */}
        {/* ============================================================== */}
        <View className="rounded-3xl bg-white border border-[#E2E8D8] p-4 mt-2 items-center">
          <View className="flex-row items-center mb-1">
            <MaterialIcons name="star" size={15} color="#176B45" />
            <MaterialIcons name="star" size={15} color="#176B45" />
            <MaterialIcons name="star" size={15} color="#176B45" />
            <MaterialIcons name="star" size={15} color="#176B45" />
            <MaterialIcons name="star" size={15} color="#176B45" />
            <Text className="text-xs font-black text-[#14221B] ml-2">4.9 / 5.0 Rating</Text>
          </View>

          <Text className="text-xs font-bold text-[#5C6E63] text-center mt-0.5">
            Serving 500+ happy homes across Kuchesar Road Chopla
          </Text>

          <View className="flex-row items-center mt-2 px-3 py-1 rounded-full bg-[#EAF4D9] border border-[#CFE6B6]">
            <MaterialIcons name="store" size={13} color="#176B45" />
            <Text className="text-[11px] font-bold text-[#176B45] ml-1">
              Main Market · Kuchesar Road Chopla, Uttar Pradesh
            </Text>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
    </ScreenContainer>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ZomatoInputField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  rightElement,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: "#14221B", marginBottom: 6 }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 16,
          backgroundColor: "#FAFAFA",
          borderWidth: 1,
          borderColor: "#E2E8D8",
          paddingHorizontal: 14,
          paddingVertical: 2,
        }}
      >
        <MaterialIcons name={icon} size={18} color="#5C6E63" />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
          keyboardType={keyboardType}
          autoCapitalize="none"
          secureTextEntry={secureTextEntry}
          style={{
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 10,
            fontSize: 14,
            color: "#14221B",
            fontWeight: "600",
          }}
        />
        {rightElement}
      </View>
    </View>
  );
}

function ZomatoFeatureCard({
  icon,
  title,
  detail,
  badge,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  detail: string;
  badge: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E2E8D8",
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <View
          style={{
            height: 32,
            width: 32,
            borderRadius: 10,
            backgroundColor: "#EAF4D9",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={18} color="#176B45" />
        </View>
        <View
          style={{
            backgroundColor: "#EAF4D9",
            borderWidth: 1,
            borderColor: "#CFE6B6",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "900", color: "#176B45" }}>{badge}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 12, fontWeight: "900", color: "#14221B" }}>{title}</Text>
      <Text style={{ fontSize: 11, lineHeight: 16, color: "#5C6E63", marginTop: 4 }}>{detail}</Text>
    </View>
  );
}
