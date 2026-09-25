import { MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DeliveryLocationPicker } from "@/components/delivery-location-picker";
import { ScreenContainer } from "@/components/screen-container";
import { getApiBaseUrl } from "@/constants/oauth";
import { money, type PaymentMethod, useNivStore } from "@/lib/niv-store";
import { preferredProductImageSource, resolveProductImageUri } from "@/lib/product-image";
import { deliveryRadiusKm, isWithinDeliveryRadius, type GeoCoordinate } from "@/shared/delivery-location";
import { canUseNivCredit } from "@/shared/niv-rules";
import {
  paymentForFulfillment,
  requiresDeliveryDetails,
  type FulfillmentMethod,
} from "@/shared/order-fulfillment";
import { isPaymentMethodAvailable } from "@/shared/payment-availability";

const paymentOptions: {
  id: Exclude<PaymentMethod, "Cash Purchasing">;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  detail: string;
  badge?: string;
  isLaunchingSoon?: boolean;
}[] = [
  {
    id: "Cash on delivery",
    icon: "payments",
    label: "Cash on Delivery",
    detail: "Pay cash at the time of delivery",
  },
  {
    id: "UPI",
    icon: "account-balance-wallet",
    label: "Instant UPI",
    detail: "Online UPI payments launching soon",
    badge: "Launching Soon",
    isLaunchingSoon: true,
  },
  {
    id: "NIV Credit",
    icon: "credit-score",
    label: "NIV Khata Credit",
    detail: "Pay later using store credit limit",
  },
];

const fulfillmentOptions: {
  id: FulfillmentMethod;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  detail: string;
}[] = [
  {
    id: "Delivery",
    icon: "local-shipping",
    label: "Home Delivery",
    detail: "Fast doorstep delivery by NIV Kirana",
  },
  {
    id: "Self Pickup",
    icon: "storefront",
    label: "Self Pickup",
    detail: "Collect ready order from shop",
  },
];

export default function CartScreen() {
  const router = useRouter();
  const {
    cart,
    cartTotal,
    getProduct,
    changeQuantity,
    removeFromCart,
    createOrder,
    customer,
    updateCustomer,
    credit,
    settings,
  } = useNivStore();

  const [fulfillment, setFulfillment] = useState<FulfillmentMethod>("Delivery");
  const [payment, setPayment] = useState<Exclude<PaymentMethod, "Cash Purchasing">>("Cash on delivery");
  const [address, setAddress] = useState(customer.address);
  const [location, setLocation] = useState<GeoCoordinate | undefined>(customer.location);
  const [note, setNote] = useState("");

  const placeOrder = async () => {
    if (payment === "UPI") {
      Alert.alert(
        "UPI Launching Soon",
        "Online UPI payments jald hi shuru ho rahe hain! Kripya abhi ke liye Cash on Delivery chunein."
      );
      return;
    }

    if (!isPaymentMethodAvailable(payment, settings)) {
      Alert.alert(
        "Payment unavailable",
        "यह payment method अभी available नहीं है। कृपया Cash on Delivery चुनें।"
      );
      return;
    }

    if (
      requiresDeliveryDetails(fulfillment) &&
      (!address.trim() || address === "अपना delivery address जोड़ें")
    ) {
      Alert.alert("Delivery address", "कृपया अपना पूरा delivery address लिखें।");
      return;
    }

    if (
      fulfillment === "Delivery" &&
      settings.storeLocation &&
      location &&
      !isWithinDeliveryRadius(
        location,
        settings.storeLocation,
        deliveryRadiusKm(settings.deliveryRadius)
      )
    ) {
      Alert.alert(
        "Outside delivery area",
        `यह pin NIV Kirana की ${settings.deliveryRadius} delivery range के बाहर है। कृपया दूसरा address चुनें।`
      );
      return;
    }

    // Stock validation
    for (const item of cart) {
      const prod = getProduct(item.productId);
      if (!prod || prod.stock <= 0) {
        Alert.alert(
          "Out of Stock",
          `क्षमा करें, "${item.productName || prod?.name || "Product"}" अभी आउट ऑफ स्टॉक (Out of Stock) है। कृपया इसे कार्ट से हटाएं।`
        );
        return;
      }
      if (item.quantity > prod.stock) {
        Alert.alert(
          "Insufficient Stock",
          `क्षमा करें, "${item.productName || prod.name}" का केवल ${prod.stock} स्टॉक उपलब्ध है। कृपया कार्ट में मात्रा कम करें।`
        );
        return;
      }
    }

    if (
      payment === "NIV Credit" &&
      !canUseNivCredit(credit.status, credit.limit, credit.used, cartTotal, credit.enabled)
    ) {
      Alert.alert(
        "Credit limit unavailable",
        "NIV Khata credit approval inactive hai ya available balance limit khatam ho chuki hai। कृपया Owner se limit reset ya approve karwayein।"
      );
      return;
    }

    const orderPayment = paymentForFulfillment(fulfillment, payment);
    const orderCustomer =
      fulfillment === "Self Pickup"
        ? { ...customer, address: `${settings.storeName} · Self Pickup`, location: undefined }
        : { ...customer, address: address.trim(), location };

    updateCustomer(orderCustomer);

    if (orderPayment === "UPI") {
      if (!settings.upiId.trim()) {
        Alert.alert(
          "UPI setup required",
          "Owner को पहले Settings में अपना UPI ID जोड़ना होगा।"
        );
        return;
      }
      const upiUrl = `upi://pay?pa=${encodeURIComponent(
        settings.upiId
      )}&pn=${encodeURIComponent(
        settings.storeName
      )}&am=${cartTotal}&cu=INR&tn=${encodeURIComponent("NIV grocery order")}`;

      try {
        if (await Linking.canOpenURL(upiUrl)) {
          await Linking.openURL(upiUrl);
        } else {
          Alert.alert(
            "UPI app",
            "कोई compatible UPI app नहीं मिला। आप COD चुन सकते हैं।"
          );
          return;
        }
      } catch {
        Alert.alert("UPI app", "UPI app नहीं खुल सका। आप COD चुन सकते हैं।");
        return;
      }
    }

    const finalNote = [
      note.trim(),
      settings.isOpen === false ? "[Advance Order - Store Closed]" : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const order = createOrder(orderPayment, finalNote || undefined, orderCustomer, fulfillment);
    if (order) {
      Alert.alert(
        "Order received",
        settings.isOpen === false
          ? "Dukaan filhaal band hai. Aapka advance order book ho gaya hai aur shop khulte hi priority par dispatch hoga!"
          : fulfillment === "Self Pickup"
          ? "आपका Self Pickup order भेज दिया गया है। Shop से ready होने पर Cash Purchasing के लिए ले जाएँ।"
          : orderPayment === "UPI"
          ? "UPI payment verification के बाद order confirm होगा।"
          : "आपका order NIV owner dashboard में भेज दिया गया है।",
        [{ text: "Track order", onPress: () => router.replace("/orders" as never) }]
      );
    }
  };

  // Empty Cart View
  if (!cart.length) {
    return (
      <ScreenContainer containerClassName="bg-[#FAF8F5]">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingBottom: 40 }}>
          <View
            style={{
              height: 96,
              width: 96,
              borderRadius: 32,
              backgroundColor: "#EAF4D9",
              borderWidth: 1,
              borderColor: "#CFE6B6",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <MaterialIcons name="shopping-basket" color="#176B45" size={48} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: "#14221B", textAlign: "center" }}>
            Your basket is empty
          </Text>
          <Text style={{ textAlign: "center", fontSize: 13, color: "#5C6E63", marginTop: 8, maxWidth: 280, lineHeight: 20 }}>
            Add fresh daily groceries, staples, and snacks to your cart for doorstep delivery.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/" as never)}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#176B45",
              borderRadius: 16,
              paddingHorizontal: 28,
              paddingVertical: 14,
              marginTop: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              elevation: 4,
              shadowColor: "#176B45",
              shadowOpacity: 0.25,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <MaterialIcons name="storefront" size={20} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, fontWeight: "900", color: "#FFFFFF", fontSize: 14 }}>
              Start Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ScreenContainer className="px-4" containerClassName="bg-background">
      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.productId}-${item.variantId ?? "base"}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="pt-2 pb-4">
            <View className="flex-row items-baseline justify-between">
              <View>
                <Text className="text-2xl font-black text-foreground tracking-tight">
                  Your Basket
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  {itemsCount} item{itemsCount === 1 ? "" : "s"} ready for checkout
                </Text>
              </View>
              <View className="px-3 py-1 rounded-full bg-[#EAF4D9]">
                <Text className="text-xs font-black text-primary">
                  {money(cartTotal)}
                </Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const product = getProduct(item.productId);
          if (!product) return null;
          const unitPrice = item.unitPrice ?? product.price;

          return (
            <View className="flex-row items-center border border-border rounded-2xl bg-surface p-3 mb-2.5 shadow-sm">
              {/* Product Thumbnail */}
              <TouchableOpacity
                accessibilityLabel={`${product.name} details`}
                onPress={() => router.push(`/product/${product.id}` as never)}
                activeOpacity={0.82}
              >
                <CartProductThumbnail product={product} />
              </TouchableOpacity>

              {/* Title & Unit Price */}
              <View className="flex-1 mx-3">
                <Text
                  numberOfLines={1}
                  className="text-sm font-black text-foreground"
                >
                  {product.name}
                </Text>
                <Text className="text-xs text-muted mt-0.5 font-medium">
                  {item.unit ?? product.unit} · {money(unitPrice)}
                </Text>

                {/* Inline Stepper */}
                <View className="flex-row items-center mt-2.5">
                  <View className="flex-row items-center rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] px-1 py-0.5">
                    <TouchableOpacity
                      onPress={() => changeQuantity(product.id, -1, item.variantId)}
                      activeOpacity={0.8}
                      className="w-6 h-6 rounded-lg items-center justify-center bg-white"
                    >
                      <MaterialIcons name="remove" size={14} color="#176B45" />
                    </TouchableOpacity>

                    <Text className="w-8 text-center text-xs font-black text-foreground">
                      {item.quantity}
                    </Text>

                    <TouchableOpacity
                      disabled={item.quantity >= product.stock}
                      onPress={() => changeQuantity(product.id, 1, item.variantId)}
                      activeOpacity={0.8}
                      className={`w-6 h-6 rounded-lg items-center justify-center ${
                        item.quantity >= product.stock ? "bg-[#176B45] opacity-35" : "bg-[#176B45]"
                      }`}
                    >
                      <MaterialIcons name="add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                {product.stock <= 0 ? (
                  <Text className="text-[10px] font-black text-[#DC2626] mt-1">
                    Out of stock · Please remove from cart
                  </Text>
                ) : item.quantity >= product.stock ? (
                  <Text className="text-[10px] font-bold text-[#D97706] mt-1">
                    Max stock reached ({product.stock} available)
                  </Text>
                ) : null}
              </View>

              {/* Subtotal & Delete Action */}
              <View className="items-end justify-between self-stretch py-0.5">
                <TouchableOpacity
                  onPress={() => removeFromCart(product.id, item.variantId)}
                  className="p-1"
                >
                  <MaterialIcons name="close" size={18} color="#C74335" />
                </TouchableOpacity>
                <Text className="text-sm font-black text-foreground">
                  {money(unitPrice * item.quantity)}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View className="pb-36 mt-3">
            {/* Store Closed Notice in Cart */}
            {settings.isOpen === false && (
              <View className="mb-4 p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] flex-row items-center">
                <View className="h-8 w-8 rounded-xl bg-[#DC2626] items-center justify-center mr-2.5 flex-shrink-0">
                  <MaterialIcons name="storefront" size={18} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-[#991B1B]">
                    Store Filhaal Closed Hai (Timings: {settings.hours})
                  </Text>
                  <Text className="text-[11px] font-semibold text-[#B91C1C] mt-0.5">
                    Aapka advance order accept ho jayega aur dukan khulte hi sabse pehle dispatch hoga.
                  </Text>
                </View>
              </View>
            )}

            {/* Fulfillment Mode Segmented Controls */}
            <View className="rounded-3xl border border-border bg-surface p-4 mb-4">
              <Text className="text-base font-black text-foreground mb-3">
                Order Fulfilment
              </Text>
              <View className="flex-row">
                {fulfillmentOptions.map((option) => {
                  const selected = fulfillment === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setFulfillment(option.id)}
                      activeOpacity={0.85}
                      className={`flex-1 rounded-2xl border p-3 ${
                        selected
                          ? "border-[#176B45] bg-[#EAF4D9]"
                          : "border-border bg-surface"
                      } ${option.id === "Delivery" ? "mr-2" : ""}`}
                    >
                      <View className="flex-row items-center">
                        <MaterialIcons
                          name={option.icon}
                          size={18}
                          color={selected ? "#176B45" : "#5C6E63"}
                        />
                        <Text className="flex-1 ml-2 text-xs font-black text-foreground">
                          {option.label}
                        </Text>
                        <MaterialIcons
                          name={
                            selected
                              ? "radio-button-checked"
                              : "radio-button-unchecked"
                          }
                          size={16}
                          color={selected ? "#176B45" : "#5C6E63"}
                        />
                      </View>
                      <Text className="text-[10px] leading-4 text-muted mt-2">
                        {option.detail}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Delivery Address or Pickup Notice */}
              {fulfillment === "Delivery" ? (
                <View className="mt-3">
                  <DeliveryLocationPicker
                    title="Delivery Address"
                    description={
                      settings.storeLocation
                        ? `Delivery area: ${settings.deliveryRadius}. Manual address bharein ya map pin chunein.`
                        : "Manual address bharein ya GPS pin chunein."
                    }
                    address={address}
                    onAddressChange={setAddress}
                    coordinate={location}
                    onCoordinateChange={setLocation}
                    storeCoordinate={settings.storeLocation}
                    deliveryRadius={settings.deliveryRadius}
                  />
                </View>
              ) : (
                <View className="flex-row items-center rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] px-3.5 py-3 mt-3">
                  <MaterialIcons name="storefront" size={20} color="#176B45" />
                  <View className="flex-1 ml-2.5">
                    <Text className="text-xs font-black text-[#176B45]">
                      Self Pickup · Pay at Store
                    </Text>
                    <Text className="text-[11px] text-muted mt-0.5">
                      Order ready hone par {settings.storeName} se collect karein.
                    </Text>
                  </View>
                </View>
              )}

              {/* Order Note */}
              <View className="flex-row items-center rounded-2xl border border-border bg-background px-3 py-2 mt-3">
                <MaterialIcons name="edit-note" size={20} color="#607266" />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Delivery note / instructions (optional)"
                  placeholderTextColor="#74847A"
                  className="flex-1 ml-2 text-xs text-foreground"
                />
              </View>
            </View>

            {/* Payment Method Section */}
            {fulfillment === "Delivery" ? (
              <View className="rounded-3xl border border-border bg-surface p-4 mb-4">
                <Text className="text-base font-black text-foreground mb-3">
                  Payment Method
                </Text>

                {paymentOptions.map((option) => {
                  const methodEnabled = isPaymentMethodAvailable(option.id, settings);
                  const availableCredit = Math.max(0, (credit.limit || 0) - (credit.used || 0));
                  const creditUnavailable =
                    option.id === "NIV Credit" &&
                    (credit.status !== "approved" ||
                      credit.enabled === false ||
                      credit.limit <= 0 ||
                      availableCredit < cartTotal);
                  const isUpiLaunchingSoon = option.id === "UPI" || Boolean(option.isLaunchingSoon);
                  const disabled = !methodEnabled || creditUnavailable || isUpiLaunchingSoon;
                  const selected = payment === option.id;

                  let detailMessage = option.detail;
                  if (option.id === "UPI") {
                    detailMessage = "Online UPI payments launching soon! Abhi ke liye Cash on Delivery chunein.";
                  } else if (option.id === "NIV Credit") {
                    if (credit.status !== "approved" || credit.limit <= 0) {
                      detailMessage = "Requires owner approval (Default ₹0)";
                    } else if (credit.enabled === false) {
                      detailMessage = "Khata credit turned off by store";
                    } else if (availableCredit < cartTotal) {
                      detailMessage = `Limit exhausted (Available: ${money(availableCredit)})`;
                    } else {
                      detailMessage = `Revolving Limit · ${money(availableCredit)} available`;
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={option.id}
                      disabled={disabled}
                      onPress={() => {
                        if (isUpiLaunchingSoon) return;
                        setPayment(option.id);
                      }}
                      activeOpacity={0.8}
                      className={`flex-row items-center rounded-2xl border p-3.5 mb-2 ${
                        selected
                          ? "border-[#176B45] bg-[#EAF4D9]"
                          : "border-border bg-surface"
                      } ${disabled ? "opacity-60 bg-[#FAFAFA]" : ""}`}
                    >
                      <View
                        className={`h-10 w-10 rounded-xl items-center justify-center ${
                          isUpiLaunchingSoon
                            ? "bg-[#F3F4F6] border border-[#E5E7EB]"
                            : "bg-background border border-[#E2E8D8]"
                        }`}
                      >
                        <MaterialIcons
                          name={option.icon}
                          size={20}
                          color={isUpiLaunchingSoon ? "#9CA3AF" : "#176B45"}
                        />
                      </View>

                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text
                            className={`text-sm font-black ${
                              isUpiLaunchingSoon ? "text-[#6B7280]" : "text-foreground"
                            }`}
                          >
                            {option.label}
                          </Text>
                          {option.badge ? (
                            <View className="ml-2 px-2 py-0.5 rounded-full bg-[#EAF4D9] border border-[#CFE6B6]">
                              <Text className="text-[10px] font-black text-[#176B45] uppercase tracking-wider">
                                {option.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-xs text-muted mt-0.5">
                          {!methodEnabled && !isUpiLaunchingSoon
                            ? "Currently unavailable in store settings"
                            : detailMessage}
                        </Text>
                      </View>

                      <MaterialIcons
                        name={
                          isUpiLaunchingSoon
                            ? "schedule"
                            : selected
                            ? "radio-button-checked"
                            : "radio-button-unchecked"
                        }
                        size={20}
                        color={
                          isUpiLaunchingSoon
                            ? "#9CA3AF"
                            : selected
                            ? "#176B45"
                            : "#74847A"
                        }
                      />
                    </TouchableOpacity>
                  );
                })}

                {credit.status === "approved" && credit.enabled !== false && credit.limit > 0 ? (
                  <View className="flex-row items-center mt-2 px-1">
                    <MaterialIcons name="check-circle" size={15} color="#176B45" />
                    <Text className="text-xs font-extrabold text-[#176B45] ml-1.5">
                      Revolving Credit Available: {money(Math.max(0, credit.limit - credit.used))} / {money(credit.limit)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View className="rounded-3xl bg-surface border border-border p-4 mb-4">
                <Text className="text-base font-black text-foreground mb-2">
                  Payment Method
                </Text>
                <View className="flex-row items-center">
                  <MaterialIcons name="payments" size={20} color="#176B45" />
                  <View className="ml-2.5">
                    <Text className="text-sm font-black text-[#176B45]">
                      Cash Purchasing at Store
                    </Text>
                    <Text className="text-xs text-muted mt-0.5">
                      Self pickup orders are paid in cash directly at the counter.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Bill Summary Breakdown */}
            <View className="rounded-3xl border border-border bg-surface p-4">
              <Text className="text-sm font-black text-foreground mb-3">
                Bill Summary
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-muted">Item Total</Text>
                <Text className="text-xs font-bold text-foreground">
                  {money(cartTotal)}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-muted">Delivery Partner Fee</Text>
                <Text className="text-xs font-extrabold text-primary uppercase">
                  Free
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs text-muted">Handling Charges</Text>
                <Text className="text-xs font-bold text-foreground">₹0</Text>
              </View>
              <View className="pt-2 border-t border-border flex-row justify-between items-baseline mt-1">
                <Text className="text-sm font-black text-foreground">
                  Total Payable
                </Text>
                <Text className="text-base font-black text-primary">
                  {money(cartTotal)}
                </Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Sticky Bottom Checkout Footer */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-3 pb-5 shadow-lg">
        <View className="flex-row justify-between items-baseline mb-2.5">
          <View>
            <Text className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Total to Pay
            </Text>
            <Text className="text-xl font-black text-foreground">
              {money(cartTotal)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs font-extrabold text-primary">
              {itemsCount} Item{itemsCount === 1 ? "" : "s"}
            </Text>
            <Text className="text-[10px] text-muted">Inclusive of all taxes</Text>
          </View>
        </View>

        {settings.isOpen === false && (
          <View className="flex-row items-center justify-center mb-2 px-2.5 py-1 rounded-lg bg-[#FEF2F2]">
            <MaterialIcons name="schedule" size={13} color="#DC2626" />
            <Text className="text-[10px] font-black text-[#DC2626] ml-1">
              Store Filhaal Closed Hai · Advance Order Book Hoga
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => void placeOrder()}
          activeOpacity={0.88}
          style={{
            backgroundColor: "#176B45",
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            elevation: 4,
            shadowColor: "#176B45",
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <MaterialIcons name="lock" size={17} color="#FFFFFF" />
          <Text style={{ marginLeft: 8, fontSize: 15, fontWeight: "900", color: "#FFFFFF" }}>
            Place Order · {money(cartTotal)}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function CartProductThumbnail({
  product,
}: {
  product: { name: string; icon: string; imageUrl?: string; imageUrls?: string[] };
}) {
  const [failed, setFailed] = useState(false);
  const imageUri = resolveProductImageUri(
    preferredProductImageSource(product),
    getApiBaseUrl()
  );

  if (imageUri && !failed) {
    return (
      <Image
        source={{ uri: imageUri }}
        accessibilityLabel={`${product.name} product photo`}
        onError={() => setFailed(true)}
        resizeMode="cover"
        className="h-16 w-16 rounded-2xl bg-[#FAF8F5]"
      />
    );
  }

  return (
    <View className="h-16 w-16 rounded-2xl bg-[#FAF8F5] items-center justify-center">
      <Text className="text-3xl">{product.icon || "🛒"}</Text>
    </View>
  );
}
