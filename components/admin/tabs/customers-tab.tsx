import React from "react";
import { View, Text, TextInput, TouchableOpacity, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { LocalCustomerAccount } from "@/lib/niv-store";

interface CustomersTabProps {
  pendingCustomers: LocalCustomerAccount[];
  approvedCustomers: LocalCustomerAccount[];
  customerSearch: string;
  onSearchChange: (text: string) => void;
  onApproveCustomer: (acc: LocalCustomerAccount) => void;
  onRejectCustomer: (acc: LocalCustomerAccount) => void;
  onOpenSecurity: (acc: LocalCustomerAccount) => void;
  onOpenDelete: (acc: LocalCustomerAccount) => void;
}

export function CustomersTab({
  pendingCustomers,
  approvedCustomers,
  customerSearch,
  onSearchChange,
  onApproveCustomer,
  onRejectCustomer,
  onOpenSecurity,
  onOpenDelete,
}: CustomersTabProps) {
  const filteredCustomers = approvedCustomers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.customer.name.toLowerCase().includes(q) ||
      c.customer.phone.includes(q) ||
      (c.customer.email && c.customer.email.toLowerCase().includes(q))
    );
  });

  return (
    <View className="space-y-4">
      {/* Section 1: Pending Approvals Queue */}
      {pendingCustomers.length > 0 && (
        <View className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 mb-2">
          <View className="flex-row items-center mb-1">
            <MaterialIcons name="person-add" size={18} color="#C2410C" />
            <Text className="text-xs font-black uppercase tracking-wider text-[#C2410C] ml-1.5">
              Pending Account Approvals ({pendingCustomers.length})
            </Text>
          </View>
          <Text className="text-[11px] text-[#9A3412] mb-3">
            Customer policy: "Visit shop for account opening once time and enjoy lifetime free". Phone/shop visit verify karke approve karein.
          </Text>

          {pendingCustomers.map((acc) => (
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
                  {acc.customer.email ? (
                    <Text className="text-[11px] text-[#495A50] mt-0.5">
                      {acc.customer.email}
                    </Text>
                  ) : null}
                  {acc.customer.address ? (
                    <Text className="text-[11px] text-muted mt-0.5" numberOfLines={2}>
                      {acc.customer.address}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-2 mt-3 pt-2 border-t border-border">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onApproveCustomer(acc)}
                  className="flex-1 rounded-xl bg-primary py-2 items-center"
                >
                  <Text className="text-xs font-black text-white">Approve Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => onRejectCustomer(acc)}
                  className="flex-1 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] py-2 items-center"
                >
                  <Text className="text-xs font-black text-[#BE123C]">Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Section 2: Registered Customer Directory Header & Search */}
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-base font-black text-foreground">
          Customer Directory
        </Text>
        <Text className="text-xs text-muted font-bold">
          {approvedCustomers.length} registered
        </Text>
      </View>

      <View className="flex-row items-center rounded-xl bg-surface border border-border px-3.5 py-1.5 mb-2">
        <MaterialIcons name="search" size={20} color="#74847A" />
        <TextInput
          value={customerSearch}
          onChangeText={onSearchChange}
          placeholder="Search customer by name, mobile, or email..."
          placeholderTextColor="#74847A"
          className="flex-1 ml-2 text-xs text-foreground py-1"
        />
        {customerSearch.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <MaterialIcons name="close" size={16} color="#74847A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <View className="rounded-2xl bg-surface border border-border p-8 items-center justify-center mt-2">
          <MaterialIcons name="people-outline" size={42} color="#CFE6B6" />
          <Text className="text-sm font-bold text-foreground mt-2">
            No customers found
          </Text>
          <Text className="text-xs text-muted text-center mt-1">
            Matching your current search query.
          </Text>
        </View>
      ) : (
        filteredCustomers.map((acc) => {
          const isAdmin = acc.role === "admin";
          const isSuspended = acc.status === "suspended";

          return (
            <View
              key={acc.id}
              className={`rounded-2xl border p-3.5 mb-2.5 flex-row items-center justify-between ${
                isSuspended
                  ? "bg-[#FFF5F4] border-[#F5C2BC]"
                  : isAdmin
                  ? "bg-[#F3F8FF] border-[#BFDBFE]"
                  : "bg-surface border-border"
              }`}
            >
              {/* Customer Bio */}
              <View className="flex-1 mr-2">
                <View className="flex-row items-center flex-wrap gap-1.5 mb-0.5">
                  <Text className="text-sm font-black text-foreground">
                    {acc.customer.name}
                  </Text>
                  {isAdmin && (
                    <View className="px-2 py-0.5 rounded-full bg-[#1E40AF]">
                      <Text className="text-[10px] font-black text-white uppercase">
                        Store Admin
                      </Text>
                    </View>
                  )}
                  {isSuspended && (
                    <View className="px-2 py-0.5 rounded-full bg-[#DC2626]">
                      <Text className="text-[10px] font-black text-white uppercase">
                        Suspended
                      </Text>
                    </View>
                  )}
                </View>

                <Text className="text-xs text-primary font-bold">
                  {acc.customer.phone}
                </Text>
                {acc.customer.email ? (
                  <Text className="text-[11px] text-[#2F6144] font-medium mt-0.5">
                    {acc.customer.email}
                  </Text>
                ) : null}
                {acc.customer.address ? (
                  <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
                    {acc.customer.address}
                  </Text>
                ) : null}
                <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
                  <Text className="text-[10px] text-muted font-medium">
                    Orders: {acc.orders?.length || 0} · Khata:{" "}
                    {acc.credit?.enabled ? `₹${acc.credit.limit} limit` : "Disabled"}
                  </Text>
                  {acc.credit?.verification?.frontDocumentUrl ? (
                    <View className="px-1.5 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0]">
                      <Text className="text-[9px] font-black text-[#047857]">
                        Aadhaar KYC ✓
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row items-center gap-1.5">
                {/* Phone Call */}
                <TouchableOpacity
                  accessibilityLabel="Call Customer"
                  activeOpacity={0.75}
                  onPress={() => {
                    const phone = acc.customer.phone.replace(/\D/g, "");
                    Linking.openURL(`tel:${phone}`);
                  }}
                  className="h-9 w-9 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] items-center justify-center"
                >
                  <MaterialIcons name="call" size={16} color="#176B45" />
                </TouchableOpacity>

                {/* Security & Access Management */}
                <TouchableOpacity
                  accessibilityLabel="Manage Customer Security"
                  activeOpacity={0.75}
                  onPress={() => onOpenSecurity(acc)}
                  className={`h-9 w-9 rounded-xl border items-center justify-center ${
                    isAdmin
                      ? "bg-[#DBEAFE] border-[#93C5FD]"
                      : "bg-[#EFF7E2] border-[#CFE6B6]"
                  }`}
                >
                  <MaterialIcons
                    name="security"
                    size={16}
                    color={isAdmin ? "#1E40AF" : "#176B45"}
                  />
                </TouchableOpacity>

                {/* Delete Account */}
                <TouchableOpacity
                  accessibilityLabel="Delete Customer Account"
                  activeOpacity={0.75}
                  onPress={() => onOpenDelete(acc)}
                  className="h-9 w-9 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] items-center justify-center"
                >
                  <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
