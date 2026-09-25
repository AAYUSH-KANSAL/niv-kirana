import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert, Image, Modal, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { money, type LocalCustomerAccount } from "@/lib/niv-store";

interface CreditTabProps {
  creditAccounts: LocalCustomerAccount[];
  onApproveCredit: (accountId: string, limit: number) => void;
  onDeclineCredit: (accountId: string) => void;
  onDeleteCredit?: (accountId: string) => void;
  onToggleCredit: (accountId: string, enabled: boolean) => void;
  onResetCreditUsed?: (accountId: string) => void;
  onSetCreditLimit?: (accountId: string, limit: number) => void;
}

export function CreditTab({
  creditAccounts,
  onApproveCredit,
  onDeclineCredit,
  onDeleteCredit,
  onToggleCredit,
  onResetCreditUsed,
  onSetCreditLimit,
}: CreditTabProps) {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [customLimitText, setCustomLimitText] = useState<string>("");
  const [approvalLimitMap, setApprovalLimitMap] = useState<Record<string, string>>({});
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{
    url: string;
    title: string;
    customerName: string;
  } | null>(null);
  const [expandedAadhaarAccounts, setExpandedAadhaarAccounts] = useState<Record<string, boolean>>({});
  const [expandedActiveAccounts, setExpandedActiveAccounts] = useState<Record<string, boolean>>({});

  const toggleExpandAadhaar = (accId: string) => {
    setExpandedAadhaarAccounts((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  const toggleExpandActiveAccount = (accId: string) => {
    setExpandedActiveAccounts((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
  };

  const pendingRequests = creditAccounts.filter(
    (a) =>
      a.credit?.status === "requested" ||
      (Boolean(a.credit?.verification?.frontDocumentUrl) && a.credit?.status !== "approved")
  );
  const activeKhata = creditAccounts.filter(
    (a) =>
      (a.credit?.status === "approved" || a.credit?.enabled) &&
      !pendingRequests.some((p) => p.id === a.id)
  );
  const otherCustomers = creditAccounts.filter(
    (a) =>
      !pendingRequests.some((p) => p.id === a.id) &&
      !activeKhata.some((ak) => ak.id === a.id)
  );

  const handleStartEditLimit = (acc: LocalCustomerAccount) => {
    setEditingAccountId(acc.id);
    setCustomLimitText(String(acc.credit?.limit || 0));
  };

  const handleSaveLimit = (accountId: string) => {
    const parsed = Math.max(0, Math.round(Number(customLimitText)));
    if (isNaN(parsed)) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric limit amount.");
      return;
    }
    if (onSetCreditLimit) {
      onSetCreditLimit(accountId, parsed);
    }
    setEditingAccountId(null);
  };

  const handleConfirmResetDues = (acc: LocalCustomerAccount) => {
    Alert.alert(
      "Clear Khata Dues",
      `Are you sure ${acc.customer.name} has cleared their ${money(acc.credit.used)} balance? This will reset used dues to ₹0.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Reset to ₹0",
          style: "destructive",
          onPress: () => {
            if (onResetCreditUsed) {
              onResetCreditUsed(acc.id);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="space-y-4">
      {/* Information Header on Khata Rules */}
      <View className="rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] p-3.5 mb-2">
        <View className="flex-row items-center mb-1">
          <MaterialIcons name="shield" size={18} color="#176B45" />
          <Text className="text-xs font-black uppercase tracking-wider text-[#176B45] ml-1.5">
            NIV Khata Credit Policy
          </Text>
        </View>
        <Text className="text-xs text-[#495A50] leading-4">
          All limits are <Text className="font-black text-foreground">Revolving Lifetime Limits</Text> (not monthly). Credit only activates when approved by Store Owner. Once exhausted, only Store Owner can reset dues after repayment.
        </Text>
      </View>

      {/* Pending Credit Applications */}
      {pendingRequests.length > 0 && (
        <View className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 mb-2">
          <View className="flex-row items-center mb-2">
            <MaterialIcons name="account-balance-wallet" size={18} color="#C2410C" />
            <Text className="text-xs font-black uppercase tracking-wider text-[#C2410C] ml-1.5">
              Pending Khata Applications ({pendingRequests.length})
            </Text>
          </View>

          {pendingRequests.map((acc) => {
            const requested = acc.credit.requestedLimit || 2000;
            const currentInputValue = approvalLimitMap[acc.id] ?? String(requested);

            return (
              <View
                key={acc.id}
                className="rounded-xl bg-surface border border-[#FED7AA] p-3 mb-2"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-black text-foreground">
                      {acc.customer.name}
                    </Text>
                    <Text className="text-xs text-primary font-bold">
                      {acc.customer.phone}
                    </Text>
                    <Text className="text-xs text-[#C2410C] font-bold mt-1">
                      Customer Requested: {money(requested)}
                    </Text>
                  </View>
                </View>

                {/* Aadhaar Card & KYC Preview Section */}
                {acc.credit.verification ? (
                  <View className="mt-3 p-3 bg-white rounded-xl border border-[#FED7AA]">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <MaterialIcons name="badge" size={17} color="#C2410C" />
                        <Text className="text-xs font-black text-[#C2410C] ml-1.5">
                          Aadhaar KYC Document
                        </Text>
                      </View>
                      {acc.credit.verification.maskedIdLastFour ? (
                        <View className="px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA]">
                          <Text className="text-[11px] font-black text-[#9A3412]">
                            XXXX-XXXX-{acc.credit.verification.maskedIdLastFour}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Address & GPS Location */}
                    {(acc.customer.address || acc.credit.verification.address) ? (
                      <View className="flex-row items-start mb-2 bg-[#F8F9FA] p-2 rounded-lg border border-[#E9ECEF]">
                        <MaterialIcons name="location-on" size={14} color="#176B45" />
                        <Text className="text-[11px] text-[#495A50] font-medium ml-1.5 flex-1">
                          {acc.customer.address || acc.credit.verification.address}
                        </Text>
                      </View>
                    ) : null}

                    {acc.credit.verification.latitude && acc.credit.verification.longitude ? (
                      <View className="flex-row items-center justify-between mb-2.5 bg-[#EFF7E2] px-2.5 py-1.5 rounded-lg border border-[#CFE6B6]">
                        <Text className="text-[10px] font-bold text-[#176B45]">
                          GPS: {acc.credit.verification.latitude.toFixed(4)}, {acc.credit.verification.longitude.toFixed(4)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            const url = `https://www.google.com/maps/search/?api=1&query=${acc.credit.verification?.latitude},${acc.credit.verification?.longitude}`;
                            void Linking.openURL(url);
                          }}
                          className="flex-row items-center"
                        >
                          <MaterialIcons name="map" size={13} color="#176B45" />
                          <Text className="text-[10px] font-black text-[#176B45] ml-1 underline">
                            Open Map
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* Aadhaar Photos (Front & Back) */}
                    <View className="flex-row gap-2 mt-1">
                      {acc.credit.verification.frontDocumentUrl ? (
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedPhotoPreview({
                              url: acc.credit.verification!.frontDocumentUrl!,
                              title: "Aadhaar Card Front",
                              customerName: acc.customer.name,
                            })
                          }
                          activeOpacity={0.8}
                          className="flex-1 rounded-xl overflow-hidden border border-[#DCECCB] bg-[#F7FAF5]"
                        >
                          <Image
                            source={{ uri: acc.credit.verification.frontDocumentUrl }}
                            style={{ width: "100%", height: 110 }}
                            resizeMode="cover"
                          />
                          <View className="p-1.5 bg-[#EAF4D9] flex-row items-center justify-center">
                            <MaterialIcons name="zoom-in" size={14} color="#176B45" />
                            <Text className="text-[10px] font-black text-[#176B45] ml-1">
                              Front (Zoom)
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-1 h-24 rounded-xl border border-dashed border-[#CFE6B6] items-center justify-center bg-[#F7FAF5]">
                          <MaterialIcons name="image-not-supported" size={20} color="#74847A" />
                          <Text className="text-[10px] text-muted font-bold mt-1">Front Missing</Text>
                        </View>
                      )}

                      {acc.credit.verification.backDocumentUrl ? (
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedPhotoPreview({
                              url: acc.credit.verification!.backDocumentUrl!,
                              title: "Aadhaar Card Back",
                              customerName: acc.customer.name,
                            })
                          }
                          activeOpacity={0.8}
                          className="flex-1 rounded-xl overflow-hidden border border-[#DCECCB] bg-[#F7FAF5]"
                        >
                          <Image
                            source={{ uri: acc.credit.verification.backDocumentUrl }}
                            style={{ width: "100%", height: 110 }}
                            resizeMode="cover"
                          />
                          <View className="p-1.5 bg-[#EAF4D9] flex-row items-center justify-center">
                            <MaterialIcons name="zoom-in" size={14} color="#176B45" />
                            <Text className="text-[10px] font-black text-[#176B45] ml-1">
                              Back (Zoom)
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View className="flex-1 h-24 rounded-xl border border-dashed border-[#CFE6B6] items-center justify-center bg-[#F7FAF5]">
                          <MaterialIcons name="image-not-supported" size={20} color="#74847A" />
                          <Text className="text-[10px] text-muted font-bold mt-1">Back Missing</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View className="mt-2.5 p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex-row items-center">
                    <MaterialIcons name="info-outline" size={15} color="#92400E" />
                    <Text className="text-[11px] font-bold text-[#92400E] ml-1.5 flex-1">
                      Direct Request (No Aadhaar photo uploaded)
                    </Text>
                  </View>
                )}

                {/* Owner Limit Input */}
                <View className="mt-2.5 flex-row items-center bg-[#FFFBEB] p-2 rounded-xl border border-[#FDE68A]">
                  <Text className="text-xs font-black text-[#92400E] mr-2">
                    Approve Limit: ₹
                  </Text>
                  <TextInput
                    value={currentInputValue}
                    onChangeText={(val) =>
                      setApprovalLimitMap((prev) => ({
                        ...prev,
                        [acc.id]: val.replace(/\D/g, ""),
                      }))
                    }
                    keyboardType="number-pad"
                    placeholder="Enter limit"
                    placeholderTextColor="#A8A29E"
                    className="flex-1 text-xs font-black text-foreground py-0.5 bg-white rounded-lg px-2 border border-[#E7E5E4]"
                  />
                </View>

                <View className="flex-row items-center gap-2 mt-3 pt-2 border-t border-border">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      const finalLimit = Math.max(
                        0,
                        Math.round(Number(currentInputValue || requested))
                      );
                      onApproveCredit(acc.id, finalLimit);
                    }}
                    className="flex-1 rounded-xl bg-primary py-2.5 items-center"
                  >
                    <Text className="text-xs font-black text-white">Approve Khata</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => onDeclineCredit(acc.id)}
                    className="flex-1 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] py-2.5 items-center"
                  >
                    <Text className="text-xs font-black text-[#BE123C]">Decline</Text>
                  </TouchableOpacity>

                  {onDeleteCredit && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        Alert.alert(
                          "Delete Credit Request?",
                          `Kya aap ${acc.customer.name} ki credit request ko delete/reset karna chahte hain? User dobara fresh application submit kar sakega.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete Request",
                              style: "destructive",
                              onPress: () => onDeleteCredit(acc.id),
                            },
                          ]
                        );
                      }}
                      className="px-3 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] py-2.5 items-center"
                    >
                      <MaterialIcons name="delete-outline" size={17} color="#4B5563" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Active Khata Accounts List */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-black text-foreground">
          Active Khata Accounts
        </Text>
        <Text className="text-xs text-muted font-bold">
          {activeKhata.length} customers
        </Text>
      </View>

      {activeKhata.length === 0 ? (
        <View className="rounded-2xl bg-surface border border-border p-8 items-center justify-center mt-2">
          <MaterialIcons name="account-balance-wallet" size={42} color="#CFE6B6" />
          <Text className="text-sm font-bold text-foreground mt-2">
            No active Khata credit accounts
          </Text>
          <Text className="text-xs text-muted text-center mt-1">
            Default Khata credit is ₹0. Customers will appear here once they submit a request and you approve their limit.
          </Text>
        </View>
      ) : (
        activeKhata.map((acc) => {
          const used = acc.credit.used || 0;
          const limit = acc.credit.limit || 0;
          const remaining = Math.max(0, limit - used);
          const isExhausted = limit > 0 && remaining === 0;
          const isEditing = editingAccountId === acc.id;
          const isExpanded = Boolean(expandedActiveAccounts[acc.id]);

          return (
            <View
              key={acc.id}
              className="rounded-2xl bg-surface border border-border p-3.5 mb-2.5 shadow-sm"
            >
              {/* Clickable Header: User Name ONLY by default */}
              <TouchableOpacity
                onPress={() => toggleExpandActiveAccount(acc.id)}
                activeOpacity={0.7}
                className="flex-row justify-between items-center"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-8 h-8 rounded-full bg-[#EAF4D9] items-center justify-center mr-2.5">
                    <MaterialIcons name="person" size={18} color="#176B45" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Text className="text-base font-black text-foreground">
                        {acc.customer.name}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full border ${
                          acc.credit.enabled
                            ? "bg-[#ECFDF5] border-[#A7F3D0]"
                            : "bg-[#FFF1F2] border-[#FECDD3]"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-black uppercase ${
                            acc.credit.enabled ? "text-[#047857]" : "text-[#BE123C]"
                          }`}
                        >
                          {acc.credit.enabled ? "Active" : "Paused"}
                        </Text>
                      </View>
                      {isExhausted && (
                        <View className="px-2 py-0.5 rounded-full bg-[#FEF2F2] border border-[#FECACA]">
                          <Text className="text-[9px] font-black uppercase text-[#DC2626]">
                            Exhausted
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center bg-[#F7FAF5] px-2.5 py-1 rounded-xl border border-[#DCECCB]">
                  <Text className="text-[11px] font-black text-primary mr-1">
                    {isExpanded ? "Band Karein" : "Data Dekhein"}
                  </Text>
                  <MaterialIcons
                    name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={20}
                    color="#176B45"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded Data Section: Visible on user click */}
              {isExpanded && (
                <View className="mt-3 pt-3 border-t border-border">
                  {/* Customer Phone Header */}
                  <View className="flex-row items-center justify-between mb-2 px-1">
                    <View className="flex-row items-center">
                      <MaterialIcons name="phone" size={14} color="#74847A" />
                      <Text className="text-xs font-bold text-muted ml-1.5">
                        {acc.customer.phone}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-bold text-muted">
                      Account ID: {acc.id.slice(0, 8)}...
                    </Text>
                  </View>

                  {/* Balance Breakdown */}
                  <View className="flex-row justify-between bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E9ECEF] mb-2.5">
                    <View>
                      <Text className="text-[10px] uppercase font-bold text-muted">
                        Total Limit
                      </Text>
                      <Text className="text-xs font-black text-foreground">
                        {money(limit)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] uppercase font-bold text-muted">
                        Used Dues
                      </Text>
                      <Text className="text-xs font-black text-[#C2410C]">
                        {money(used)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-[10px] uppercase font-bold text-muted">
                        Available
                      </Text>
                      <Text
                        className={`text-xs font-black ${
                          remaining > 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                        }`}
                      >
                        {money(remaining)}
                      </Text>
                    </View>
                  </View>

                  {/* Inline Edit Limit Form */}
                  {isEditing ? (
                    <View className="bg-[#EAF4D9] p-2.5 rounded-xl border border-[#CFE6B6] mb-2 flex-row items-center gap-2">
                      <Text className="text-xs font-bold text-foreground">Limit: ₹</Text>
                      <TextInput
                        value={customLimitText}
                        onChangeText={(val) => setCustomLimitText(val.replace(/\D/g, ""))}
                        keyboardType="number-pad"
                        className="flex-1 bg-white border border-[#E2E8D8] rounded-lg px-2 py-1 text-xs font-black"
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveLimit(acc.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary"
                      >
                        <Text className="text-xs font-black text-white">Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingAccountId(null)}
                        className="px-2 py-1.5 rounded-lg bg-surface border border-border"
                      >
                        <Text className="text-xs font-bold text-muted">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Controls Row: Pause/Active switch, Clear Dues & Set Limit */}
                  <View className="flex-row items-center gap-2 mb-2.5">
                    <TouchableOpacity
                      onPress={() => onToggleCredit(acc.id, !acc.credit.enabled)}
                      className={`flex-1 flex-row items-center justify-center py-2 rounded-xl border ${
                        acc.credit.enabled
                          ? "bg-[#FFF1F2] border-[#FECDD3]"
                          : "bg-[#ECFDF5] border-[#A7F3D0]"
                      }`}
                    >
                      <MaterialIcons
                        name={acc.credit.enabled ? "pause-circle" : "play-circle"}
                        size={14}
                        color={acc.credit.enabled ? "#BE123C" : "#047857"}
                      />
                      <Text
                        className={`text-xs font-black ml-1 ${
                          acc.credit.enabled ? "text-[#BE123C]" : "text-[#047857]"
                        }`}
                      >
                        {acc.credit.enabled ? "Pause Khata" : "Activate Khata"}
                      </Text>
                    </TouchableOpacity>

                    {used > 0 && onResetCreditUsed && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => handleConfirmResetDues(acc)}
                        className="flex-1 flex-row items-center justify-center rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] py-2"
                      >
                        <MaterialIcons name="restart-alt" size={14} color="#047857" />
                        <Text className="text-xs font-black text-[#047857] ml-1">
                          Clear Dues (₹0)
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleStartEditLimit(acc)}
                      className="flex-1 flex-row items-center justify-center rounded-xl bg-surface border border-border py-2"
                    >
                      <MaterialIcons name="edit" size={14} color="#495A50" />
                      <Text className="text-xs font-black text-foreground ml-1">
                        Set Limit
                      </Text>
                    </TouchableOpacity>

                    {onDeleteCredit && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          Alert.alert(
                            "Reset / Delete Khata?",
                            `Kya aap ${acc.customer.name} ka Khata delete/reset karna chahte hain? Inka account clear ho jayega aur ye dobara fresh application submit kar sakenge.`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Yes, Reset Khata",
                                style: "destructive",
                                onPress: () => onDeleteCredit(acc.id),
                              },
                            ]
                          );
                        }}
                        className="px-3 flex-row items-center justify-center rounded-xl bg-[#FFF1F2] border border-[#FECDD3] py-2"
                      >
                        <MaterialIcons name="delete-outline" size={15} color="#BE123C" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Customer Address Details */}
                  {(acc.customer.address || acc.credit.verification?.address) && (
                    <View className="flex-row items-start mb-2 bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <MaterialIcons name="location-on" size={15} color="#176B45" />
                      <View className="ml-1.5 flex-1">
                        <Text className="text-[10px] font-bold text-muted uppercase">
                          Customer Address
                        </Text>
                        <Text className="text-xs text-[#1C1C1C] font-semibold mt-0.5">
                          {acc.customer.address || acc.credit.verification?.address}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* GPS Coordinates with Map link */}
                  {acc.credit.verification?.latitude && acc.credit.verification?.longitude ? (
                    <View className="flex-row items-center justify-between mb-2.5 bg-[#EFF7E2] px-3 py-2 rounded-xl border border-[#CFE6B6]">
                      <View className="flex-row items-center">
                        <MaterialIcons name="my-location" size={14} color="#176B45" />
                        <Text className="text-[11px] font-bold text-[#176B45] ml-1.5">
                          GPS: {acc.credit.verification.latitude.toFixed(4)}, {acc.credit.verification.longitude.toFixed(4)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          const url = `https://www.google.com/maps/search/?api=1&query=${acc.credit.verification?.latitude},${acc.credit.verification?.longitude}`;
                          void Linking.openURL(url);
                        }}
                        className="flex-row items-center px-2 py-1 bg-white rounded-lg border border-[#CFE6B6]"
                      >
                        <MaterialIcons name="map" size={12} color="#176B45" />
                        <Text className="text-[10px] font-black text-[#176B45] ml-1">
                          Open in Google Maps
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Front & Back Aadhaar Documents Preview */}
                  {acc.credit.verification?.frontDocumentUrl || acc.credit.verification?.backDocumentUrl ? (
                    <View className="mt-1 p-3 bg-white rounded-xl border border-[#FED7AA]">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <MaterialIcons name="badge" size={16} color="#C2410C" />
                          <Text className="text-xs font-black text-[#C2410C] ml-1.5">
                            Aadhaar KYC Documents (Front & Back)
                          </Text>
                        </View>
                        {acc.credit.verification.maskedIdLastFour ? (
                          <View className="px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA]">
                            <Text className="text-[10px] font-black text-[#9A3412]">
                              XXXX-XXXX-{acc.credit.verification.maskedIdLastFour}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Photo Cards Row */}
                      <View className="flex-row gap-2 mt-1">
                        {acc.credit.verification.frontDocumentUrl ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedPhotoPreview({
                                url: acc.credit.verification!.frontDocumentUrl!,
                                title: "Aadhaar Card Front",
                                customerName: acc.customer.name,
                              })
                            }
                            activeOpacity={0.8}
                            className="flex-1 rounded-xl overflow-hidden border border-[#DCECCB] bg-white shadow-sm"
                          >
                            <Image
                              source={{ uri: acc.credit.verification.frontDocumentUrl }}
                              style={{ width: "100%", height: 110 }}
                              resizeMode="cover"
                            />
                            <View className="p-1.5 bg-[#EAF4D9] flex-row items-center justify-center">
                              <MaterialIcons name="zoom-in" size={14} color="#176B45" />
                              <Text className="text-[10px] font-black text-[#176B45] ml-1">
                                Front (Tap to Zoom)
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View className="flex-1 rounded-xl border border-dashed border-[#D1D5DB] items-center justify-center p-3 bg-[#F9FAFB]">
                            <MaterialIcons name="image-not-supported" size={20} color="#9CA3AF" />
                            <Text className="text-[10px] text-muted font-bold mt-1 text-center">
                              Front Not Uploaded
                            </Text>
                          </View>
                        )}

                        {acc.credit.verification.backDocumentUrl ? (
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedPhotoPreview({
                                url: acc.credit.verification!.backDocumentUrl!,
                                title: "Aadhaar Card Back",
                                customerName: acc.customer.name,
                              })
                            }
                            activeOpacity={0.8}
                            className="flex-1 rounded-xl overflow-hidden border border-[#DCECCB] bg-white shadow-sm"
                          >
                            <Image
                              source={{ uri: acc.credit.verification.backDocumentUrl }}
                              style={{ width: "100%", height: 110 }}
                              resizeMode="cover"
                            />
                            <View className="p-1.5 bg-[#EAF4D9] flex-row items-center justify-center">
                              <MaterialIcons name="zoom-in" size={14} color="#176B45" />
                              <Text className="text-[10px] font-black text-[#176B45] ml-1">
                                Back (Tap to Zoom)
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View className="flex-1 rounded-xl border border-dashed border-[#D1D5DB] items-center justify-center p-3 bg-[#F9FAFB]">
                            <MaterialIcons name="image-not-supported" size={20} color="#9CA3AF" />
                            <Text className="text-[10px] text-muted font-bold mt-1 text-center">
                              Back Not Uploaded
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View className="mt-1 p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex-row items-center">
                      <MaterialIcons name="verified-user" size={16} color="#92400E" />
                      <Text className="text-[11px] font-bold text-[#92400E] ml-1.5 flex-1">
                        Direct Admin Approval — Trust ke aadhar par bina Aadhaar upload ke limit di gayi hai.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Other Registered Customers Section */}
      {otherCustomers.length > 0 && (
        <View className="mt-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-base font-black text-foreground">
              Other Registered Customers ({otherCustomers.length})
            </Text>
            <Text className="text-xs text-muted font-bold">
              Khata ₹0
            </Text>
          </View>

          {otherCustomers.map((acc) => {
            const hasAadhaar = Boolean(acc.credit?.verification?.frontDocumentUrl);
            const currentInputValue = approvalLimitMap[acc.id] ?? "2000";

            return (
              <View
                key={acc.id}
                className="rounded-2xl bg-surface border border-border p-3.5 mb-2.5"
              >
                <View className="flex-row justify-between items-start mb-1.5">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-black text-foreground">
                      {acc.customer.name}
                    </Text>
                    <Text className="text-xs text-primary font-bold">
                      {acc.customer.phone}
                    </Text>
                    {acc.customer.address ? (
                      <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
                        {acc.customer.address}
                      </Text>
                    ) : null}
                  </View>

                  <View className="px-2 py-0.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB]">
                    <Text className="text-[9px] font-bold text-muted uppercase">
                      Limit ₹0
                    </Text>
                  </View>
                </View>

                {/* Aadhaar preview if uploaded */}
                {hasAadhaar && acc.credit.verification ? (
                  <View className="mt-2 p-2.5 bg-[#EFF7E2] rounded-xl border border-[#CFE6B6]">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text className="text-[11px] font-black text-[#176B45]">
                        ✓ Aadhaar KYC Uploaded
                      </Text>
                      {acc.credit.verification.maskedIdLastFour ? (
                        <Text className="text-[10px] font-bold text-[#176B45]">
                          •••• {acc.credit.verification.maskedIdLastFour}
                        </Text>
                      ) : null}
                    </View>
                    <View className="flex-row gap-2">
                      {acc.credit.verification.frontDocumentUrl ? (
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedPhotoPreview({
                              url: acc.credit.verification!.frontDocumentUrl!,
                              title: "Aadhaar Card Front",
                              customerName: acc.customer.name,
                            })
                          }
                          className="flex-1 rounded-lg overflow-hidden border border-[#DCECCB] bg-white"
                        >
                          <Image
                            source={{ uri: acc.credit.verification.frontDocumentUrl }}
                            style={{ width: "100%", height: 80 }}
                            resizeMode="cover"
                          />
                          <View className="p-0.5 bg-[#EAF4D9] items-center">
                            <Text className="text-[8px] font-bold text-[#176B45]">Front (Tap Zoom)</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                      {acc.credit.verification.backDocumentUrl ? (
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedPhotoPreview({
                              url: acc.credit.verification!.backDocumentUrl!,
                              title: "Aadhaar Card Back",
                              customerName: acc.customer.name,
                            })
                          }
                          className="flex-1 rounded-lg overflow-hidden border border-[#DCECCB] bg-white"
                        >
                          <Image
                            source={{ uri: acc.credit.verification.backDocumentUrl }}
                            style={{ width: "100%", height: 80 }}
                            resizeMode="cover"
                          />
                          <View className="p-0.5 bg-[#EAF4D9] items-center">
                            <Text className="text-[8px] font-bold text-[#176B45]">Back (Tap Zoom)</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {/* Grant Khata Limit Input & Action */}
                <View className="mt-2.5 pt-2 border-t border-border flex-row items-center gap-2">
                  <View className="flex-row items-center bg-[#F8F9FA] px-2 py-1 rounded-lg border border-[#E9ECEF] flex-1">
                    <Text className="text-[10px] font-bold text-muted mr-1">Limit: ₹</Text>
                    <TextInput
                      value={currentInputValue}
                      onChangeText={(val) =>
                        setApprovalLimitMap((prev) => ({
                          ...prev,
                          [acc.id]: val.replace(/\D/g, ""),
                        }))
                      }
                      keyboardType="number-pad"
                      placeholder="2000"
                      className="flex-1 text-xs font-black text-foreground py-0.5"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const lim = Math.max(500, Number(currentInputValue || 2000));
                      onApproveCredit(acc.id, lim);
                    }}
                    className="px-3 py-2 bg-primary rounded-xl"
                  >
                    <Text className="text-xs font-black text-white">Enable Khata</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Full-Screen Aadhaar Photo Viewer Modal */}
      <Modal
        visible={Boolean(selectedPhotoPreview)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhotoPreview(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center p-4">
          <View className="w-full max-w-lg bg-surface rounded-3xl overflow-hidden shadow-2xl border border-border">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-border bg-[#F8F9FA]">
              <View>
                <Text className="text-base font-black text-foreground">
                  {selectedPhotoPreview?.title}
                </Text>
                <Text className="text-xs text-muted font-bold mt-0.5">
                  Customer: {selectedPhotoPreview?.customerName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPhotoPreview(null)}
                className="h-9 w-9 rounded-full bg-surface border border-border items-center justify-center"
              >
                <MaterialIcons name="close" size={20} color="#1C1C1C" />
              </TouchableOpacity>
            </View>

            {/* Modal Body: High-Res Image Preview */}
            <View className="p-3 bg-black/5 items-center justify-center">
              {selectedPhotoPreview?.url ? (
                <Image
                  source={{ uri: selectedPhotoPreview.url }}
                  style={{ width: "100%", height: 350 }}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            {/* Modal Footer */}
            <View className="p-3 bg-[#F8F9FA] border-t border-border flex-row justify-between items-center">
              <View className="flex-row items-center">
                <MaterialIcons name="security" size={16} color="#176B45" />
                <Text className="text-[11px] font-bold text-[#176B45] ml-1.5">
                  Encrypted & Compressed KYC Record
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPhotoPreview(null)}
                className="px-4 py-2 bg-primary rounded-xl"
              >
                <Text className="text-xs font-black text-white">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
