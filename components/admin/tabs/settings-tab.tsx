import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { StoreSettings } from "@/lib/niv-store";

interface SettingsTabProps {
  settings: StoreSettings;
  onSaveSettings: (updates: Partial<StoreSettings>) => Promise<void>;
}

export function SettingsTab({ settings, onSaveSettings }: SettingsTabProps) {
  const [isOpen, setIsOpen] = useState(settings.isOpen !== false);
  const [storeName, setStoreName] = useState(settings.storeName || "");
  const [phone, setPhone] = useState(settings.phone || "");
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp || "");
  const [upiId, setUpiId] = useState(settings.upiId || "");
  const [deliveryRadius, setDeliveryRadius] = useState(settings.deliveryRadius || "10 km");
  const [openingTime, setOpeningTime] = useState(settings.openingTime || "8:00 AM");
  const [closingTime, setClosingTime] = useState(settings.closingTime || "9:00 PM");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setIsOpen(settings.isOpen !== false);
    setStoreName(settings.storeName || "");
    setPhone(settings.phone || "");
    setWhatsapp(settings.whatsapp || "");
    setUpiId(settings.upiId || "");
    setDeliveryRadius(settings.deliveryRadius || "10 km");
    setOpeningTime(settings.openingTime || "8:00 AM");
    setClosingTime(settings.closingTime || "9:00 PM");
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveSettings({
        isOpen,
        storeName: storeName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        upiId: upiId.trim(),
        deliveryRadius: deliveryRadius.trim(),
        openingTime: openingTime.trim(),
        closingTime: closingTime.trim(),
        hours: `${openingTime.trim()} – ${closingTime.trim()}`,
      });
      Alert.alert("Settings Saved", "Store settings have been updated in the cloud.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update store settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="space-y-4">
      {/* Store Open / Close Status Card */}
      <View
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: isOpen ? "#F0FDF4" : "#FEF2F2",
          borderColor: isOpen ? "#BBF7D0" : "#FECACA",
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center flex-1 pr-2">
            <View
              className="h-3 w-3 rounded-full mr-2"
              style={{ backgroundColor: isOpen ? "#16A34A" : "#DC2626" }}
            />
            <Text
              className="text-sm font-black uppercase tracking-wider"
              style={{ color: isOpen ? "#15803D" : "#B91C1C" }}
            >
              {isOpen ? "Store Status: DUKAAN OPEN" : "Store Status: DUKAAN CLOSED"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsOpen(!isOpen)}
            activeOpacity={0.8}
            className="px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: isOpen ? "#DC2626" : "#16A34A" }}
          >
            <Text className="text-xs font-black text-white uppercase">
              {isOpen ? "Close Karein" : "Open Karein"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text
          className="text-xs font-semibold"
          style={{ color: isOpen ? "#166534" : "#991B1B" }}
        >
          {isOpen
            ? "Dukaan abhi OPEN hai. Customers store ko open dekhenge aur live fast delivery ke sath order place kar sakte hain."
            : "Dukaan abhi CLOSED hai. Customer app par store band hone ka clear notice dikhega."}
        </Text>
      </View>

      <View className="rounded-2xl bg-surface border border-border p-4">
        <Text className="text-base font-black text-foreground mb-1">
          Store Operations & Profile
        </Text>
        <Text className="text-xs text-muted mb-4">
          Configure customer hotlines, delivery reach, and UPI payment details.
        </Text>

        {/* Store Name */}
        <View className="mb-3">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Store Name
          </Text>
          <TextInput
            value={storeName}
            onChangeText={setStoreName}
            placeholder="NIV Kirana"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* Contact Numbers */}
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
              Store Phone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="7060902859"
              placeholderTextColor="#74847A"
              className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
            />
          </View>

          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
              WhatsApp Hotline
            </Text>
            <TextInput
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
              placeholder="7060902859"
              placeholderTextColor="#74847A"
              className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
            />
          </View>
        </View>

        {/* UPI ID */}
        <View className="mb-3">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Store UPI ID (For Online Payments)
          </Text>
          <TextInput
            value={upiId}
            onChangeText={setUpiId}
            placeholder="nivkirana@upi"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* Store Timings */}
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
              Opening Time
            </Text>
            <TextInput
              value={openingTime}
              onChangeText={setOpeningTime}
              placeholder="8:00 AM"
              placeholderTextColor="#74847A"
              className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
            />
          </View>

          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
              Closing Time
            </Text>
            <TextInput
              value={closingTime}
              onChangeText={setClosingTime}
              placeholder="9:00 PM"
              placeholderTextColor="#74847A"
              className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
            />
          </View>
        </View>

        {/* Delivery Radius */}
        <View className="mb-4">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Delivery Radius
          </Text>
          <TextInput
            value={deliveryRadius}
            onChangeText={setDeliveryRadius}
            placeholder="10 km"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#176B45",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            justifyContent: "center",
            elevation: 2,
            shadowColor: "#176B45",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>
            {saving ? "Saving to Cloud..." : "Save Store Settings"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Catalog Categories Management Card */}
      <View className="rounded-2xl bg-surface border border-border p-4 mb-8">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-base font-black text-foreground">
            Store Catalog Categories
          </Text>
          <MaterialIcons name="category" size={20} color="#16A34A" />
        </View>
        <Text className="text-xs text-muted mb-3.5">
          Yeh categories customer app aur admin panel par products ko organize karne ke liye use hoti hain.
        </Text>

        {/* Existing Categories List */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          {(settings.catalogCategories ?? [
            "All",
            "Staples",
            "Pulses",
            "Dairy",
            "Fresh",
            "Snacks",
            "Beverages",
            "Home care",
            "Personal care",
          ]).map((cat) => {
            const isAll = cat.toLowerCase() === "all";
            return (
              <View
                key={`settings-cat-${cat}`}
                className="flex-row items-center px-3 py-1.5 rounded-full bg-[#F4F8EF] border border-[#CFE6B6]"
              >
                <Text className="text-xs font-extrabold text-[#176B45] mr-1">
                  {cat}
                </Text>
                {!isAll ? (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Delete Category",
                        `Category "${cat}" ko catalog se hatana chahte hain?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              const updated = (settings.catalogCategories ?? []).filter(
                                (c) => c.toLowerCase() !== cat.toLowerCase()
                              );
                              await onSaveSettings({ catalogCategories: updated });
                              Alert.alert("Category Deleted", `Category "${cat}" hata di gayi hai.`);
                            },
                          },
                        ]
                      );
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={14} color="#C74335" />
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Add New Category Input in Settings */}
        <CategoryAdder
          onAdd={async (newCat) => {
            const trimmed = newCat.trim();
            if (!trimmed) return;
            const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            if (formatted.toLowerCase() === "all") {
              Alert.alert("Invalid Name", "'All' category reserve hai.");
              return;
            }
            const current = settings.catalogCategories ?? [
              "All",
              "Staples",
              "Pulses",
              "Dairy",
              "Fresh",
              "Snacks",
              "Beverages",
              "Home care",
              "Personal care",
            ];
            if (current.some((c) => c.toLowerCase() === formatted.toLowerCase())) {
              Alert.alert("Already Exists", `Category "${formatted}" pehle se maujood hai.`);
              return;
            }
            const updated = [...current, formatted];
            await onSaveSettings({ catalogCategories: updated });
            Alert.alert("Category Added", `Nayi category "${formatted}" store catalog me add kar di gayi hai.`);
          }}
        />
      </View>
    </View>
  );
}

function CategoryAdder({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!input.trim()) {
      Alert.alert("Name Required", "Kripya nayi category ka naam likhein.");
      return;
    }
    setLoading(true);
    try {
      await onAdd(input.trim());
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-row items-center gap-2 pt-2 border-t border-border">
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Nayi category ka naam (e.g. Masale, Bakery)..."
        placeholderTextColor="#74847A"
        className="flex-1 rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
      />
      <TouchableOpacity
        onPress={handlePress}
        disabled={loading}
        activeOpacity={0.8}
        style={{
          backgroundColor: "#16A34A",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900" }}>
          {loading ? "Adding..." : "+ Add"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
