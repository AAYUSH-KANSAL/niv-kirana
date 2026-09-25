import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, Linking, Alert } from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { money, type OrderStatus } from "@/lib/niv-store";
import type { OwnerOrder } from "@/shared/owner-order-routing";
import { VoiceAudioPlayer } from "@/components/voice-audio-player";

interface OrdersTabProps {
  orders: OwnerOrder[];
  orderSearch: string;
  onSearchChange: (text: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onUpdateStatus: (order: OwnerOrder, newStatus: OrderStatus) => void;
  onUpdateOrderTotal?: (order: OwnerOrder, total: number) => void;
  onDeleteOrder: (order: OwnerOrder) => void;
  onCancelOrder?: (order: OwnerOrder) => void;
}

const statusOptions = [
  "Active Orders",
  "All",
  "Completed",
  "Cancelled",
];

const activeSubOptions = [
  { label: "All Active", value: "Active Orders" },
  { label: "New", value: "New" },
  { label: "Packed", value: "Packed" },
  { label: "Out for delivery", value: "Out for delivery" },
];

const nextStatusMap: Record<OrderStatus, OrderStatus | null> = {
  New: "Packed",
  Packed: "Out for delivery",
  "Out for delivery": "Delivered",
  Delivered: null,
  Cancelled: null,
  "Payment pending": "New",
};

export function OrdersTab({
  orders,
  orderSearch,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onUpdateStatus,
  onUpdateOrderTotal,
  onDeleteOrder,
  onCancelOrder,
}: OrdersTabProps) {
  const [billInputs, setBillInputs] = useState<Record<string, string>>({});
  const [savingOrderIds, setSavingOrderIds] = useState<Record<string, boolean>>({});
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [editingBillOrderIds, setEditingBillOrderIds] = useState<Record<string, boolean>>({});

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleSaveBill = async (order: OwnerOrder) => {
    const raw = billInputs[order.id] ?? (order.total > 0 ? String(order.total) : "");
    const parsed = parseFloat(raw.trim());
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid Amount", "Kripya sahi bill amount enter karein (greater than 0).");
      return;
    }
    setSavingOrderIds((prev) => ({ ...prev, [order.id]: true }));
    try {
      onUpdateOrderTotal?.(order, parsed);
      setEditingBillOrderIds((prev) => ({ ...prev, [order.id]: false }));
      Alert.alert("Bill Saved", `Order #${order.id} ka bill ₹${parsed} save ho gaya hai.`);
    } catch (e) {
      Alert.alert("Error", "Bill update karne mein samasya aayi.");
    } finally {
      setSavingOrderIds((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case "New":
        return { bg: "bg-[#EFF6FF]", text: "text-[#1E40AF]", border: "border-[#BFDBFE]" };
      case "Packed":
        return { bg: "bg-[#F3E8FF]", text: "text-[#6B21A8]", border: "border-[#E9D5FF]" };
      case "Out for delivery":
        return { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", border: "border-[#FED7AA]" };
      case "Delivered":
        return { bg: "bg-[#ECFDF5]", text: "text-[#047857]", border: "border-[#A7F3D0]" };
      case "Cancelled":
        return { bg: "bg-[#FEE2E2]", text: "text-[#DC2626]", border: "border-[#FCA5A5]" };
      case "Payment pending":
        return { bg: "bg-[#FFF1F2]", text: "text-[#BE123C]", border: "border-[#FECDD3]" };
      default:
        return { bg: "bg-surface", text: "text-foreground", border: "border-border" };
    }
  };

  const sendWhatsAppBill = (order: OwnerOrder) => {
    const rawPhone = order.customer.phone.replace(/\D/g, "");
    const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const itemsList = order.items.length > 0
      ? order.items
          .map((item) => `• ${item.productName || "Item"} x${item.quantity} (₹${item.unitPrice})`)
          .join("%0A")
      : "• Voice Order (Recorded Request)";
    const msg = `Namaste ${order.customer.name},%0AAapka NIV Kirana Order #${order.id} update hua hai.%0AStatus: ${order.status}%0ATotal Bill: ₹${order.total}%0A%0AItems:%0A${itemsList}%0A%0AShukriya!`;
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
  };

  return (
    <View className="space-y-3">
      {/* Search Input */}
      <View className="flex-row items-center rounded-xl bg-surface border border-border px-3.5 py-1.5">
        <MaterialIcons name="search" size={20} color="#74847A" />
        <TextInput
          value={orderSearch}
          onChangeText={onSearchChange}
          placeholder="Search by Order ID, customer, or phone..."
          placeholderTextColor="#74847A"
          className="flex-1 ml-2 text-xs text-foreground py-1"
        />
        {orderSearch.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange("")}>
            <MaterialIcons name="close" size={16} color="#74847A" />
          </TouchableOpacity>
        )}
      </View>

      {/* Primary Status Filters: Active Orders, All, Completed, Cancelled */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
        <View className="flex-row gap-1.5">
          {statusOptions.map((st, index) => {
            const isCurrentActiveCategory =
              statusFilter === st ||
              (st === "Active Orders" && ["New", "Packed", "Out for delivery", "Payment pending"].includes(statusFilter));
            return (
              <Pressable
                key={`order-st-${st}-${index}`}
                onPress={() => onStatusFilterChange(st)}
                style={({ hovered }) => ({
                  backgroundColor: isCurrentActiveCategory
                    ? "#176B45"
                    : hovered
                    ? "#EAF4D9"
                    : "#FFFFFF",
                  borderColor: isCurrentActiveCategory
                    ? "#176B45"
                    : hovered
                    ? "#176B45"
                    : "#E5E7EB",
                  borderWidth: 1,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                })}
              >
                {({ hovered }) => (
                  <>
                    {st === "Active Orders" && (
                      <View
                        style={{
                          height: 8,
                          width: 8,
                          borderRadius: 4,
                          marginRight: 6,
                          backgroundColor: isCurrentActiveCategory ? "#86EFAC" : "#16A34A",
                        }}
                      />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: isCurrentActiveCategory
                          ? "#FFFFFF"
                          : hovered
                          ? "#176B45"
                          : "#495A50",
                      }}
                    >
                      {st}
                    </Text>
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Live Order Sub-Filter (when Active Orders is active) */}
      {(statusFilter === "Active Orders" || ["New", "Packed", "Out for delivery", "Payment pending"].includes(statusFilter)) && (
        <View className="flex-row items-center bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-2.5 py-1.5 gap-1.5">
          <Text className="text-[10px] font-black uppercase text-[#166534] mr-1">
            Live:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-1">
              {activeSubOptions.map((sub) => {
                const isSelected = statusFilter === sub.value;
                return (
                  <Pressable
                    key={`active-sub-${sub.value}`}
                    onPress={() => onStatusFilterChange(sub.value)}
                    style={({ hovered }) => ({
                      backgroundColor: isSelected
                        ? "#166534"
                        : hovered
                        ? "#E2FBE8"
                        : "#FFFFFF",
                      borderColor: isSelected
                        ? "#166534"
                        : hovered
                        ? "#166534"
                        : "#BBF7D0",
                      borderWidth: 1,
                      paddingHorizontal: 11,
                      paddingVertical: 4.5,
                      borderRadius: 8,
                    })}
                  >
                    {({ hovered }) => (
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: isSelected
                            ? "#FFFFFF"
                            : hovered
                            ? "#14532D"
                            : "#166534",
                        }}
                      >
                        {sub.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Orders Count Indicator */}
      <View className="flex-row justify-between items-center py-1">
        <Text className="text-xs font-black uppercase tracking-wider text-muted">
          Showing {orders.length} orders
        </Text>
      </View>

      {/* Orders List */}
      {orders.length === 0 ? (
        <View className="rounded-2xl bg-surface border border-border p-8 items-center justify-center mt-4">
          <MaterialIcons name="receipt-long" size={42} color="#CFE6B6" />
          <Text className="text-sm font-bold text-foreground mt-2">
            No orders found
          </Text>
          <Text className="text-xs text-muted text-center mt-1">
            Matching the current search filter criteria.
          </Text>
        </View>
      ) : (
        orders.map((order) => {
          const badge = getStatusBadgeStyle(order.status);
          const nextStatus = nextStatusMap[order.status];
          const isExpanded = Boolean(expandedOrderIds[order.id]);
          const isEditingBill = Boolean(editingBillOrderIds[order.id]);

          const isVoice = Boolean(
            order.audioUri ||
            order.id.startsWith("NIV-VOICE") ||
            (order.items.length === 0 && Boolean(order.audioUri))
          );

          const timeFormatted = (() => {
            try {
              const d = new Date(order.createdAt);
              if (isNaN(d.getTime())) return "Recently";
              return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            } catch {
              return "Recently";
            }
          })();

          return (
            <View
              key={order.id}
              className="rounded-2xl bg-surface border border-border p-4 mb-2.5 shadow-sm"
            >
              {/* Clickable Header: Tap to expand or collapse order details */}
              <TouchableOpacity
                onPress={() => toggleExpandOrder(order.id)}
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-1.5">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-base font-black text-foreground">
                        #{order.id}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full border ${badge.bg} ${badge.border}`}
                      >
                        <Text className={`text-[10px] font-black uppercase ${badge.text}`}>
                          {order.status === "Delivered" ? "Completed" : order.status}
                        </Text>
                      </View>
                      {isVoice && (
                        <View className="px-2 py-0.5 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex-row items-center">
                          <MaterialIcons name="keyboard-voice" size={11} color="#EA580C" />
                          <Text className="text-[10px] font-black uppercase text-[#EA580C] ml-0.5">
                            Voice Order
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-muted font-bold mt-1">
                      {order.customer.name} · {order.customer.phone}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-base font-black text-primary">
                      {order.total > 0 ? money(order.total) : "₹0 (Pending)"}
                    </Text>
                    {isVoice && order.total === 0 && (
                      <Text className="text-[10px] font-bold text-[#EA580C]">
                        Bill not set
                      </Text>
                    )}
                  </View>
                </View>

                {/* Bottom Toggle Row in Header */}
                <View className="flex-row items-center justify-between pt-1 mt-0.5">
                  <Text className="text-[10px] text-muted font-semibold">
                    {timeFormatted} · {order.items.length > 0 ? `${order.items.length} items` : isVoice ? "Voice message" : "Standard order"}
                  </Text>
                  <View className="flex-row items-center bg-[#F7FAF5] px-2.5 py-1 rounded-xl border border-[#DCECCB]">
                    <Text className="text-[11px] font-black text-primary mr-1">
                      {isExpanded ? "Band Karein" : "Details Dekhein"}
                    </Text>
                    <MaterialIcons
                      name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={18}
                      color="#176B45"
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Expanded Details Section: Shown ONLY on Click */}
              {isExpanded && (
                <View className="mt-3 pt-3 border-t border-border">
                  {/* Delivery Address */}
                  {order.customer.address ? (
                    <View className="flex-row items-center mb-2.5 bg-[#F7FAF5] p-2.5 rounded-xl border border-[#DCECCB]">
                      <MaterialIcons name="location-on" size={15} color="#176B45" />
                      <Text className="text-xs text-[#495A50] ml-1.5 flex-1 font-medium">
                        {order.customer.address}
                      </Text>
                    </View>
                  ) : null}

                  {/* Voice Order Audio Player & Bill Amount Input */}
                  {isVoice ? (
                    <View className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-3 mb-3">
                      <View className="flex-row items-center mb-1">
                        <MaterialIcons name="record-voice-over" size={17} color="#EA580C" />
                        <Text className="text-xs font-black text-[#9A3412] ml-1.5">
                          Customer Voice Recording
                        </Text>
                      </View>

                      {/* Voice Recording Player */}
                      <VoiceAudioPlayer
                        audioUri={order.audioUri}
                        title={`Voice Note: ${order.customer.name}`}
                        accentColor="#EA580C"
                      />

                      {order.note ? (
                        <Text className="text-[11px] text-[#9A3412] mt-1 font-medium italic">
                          {order.note}
                        </Text>
                      ) : null}

                      {/* Bill Amount Section */}
                      <View className="mt-2.5 pt-2.5 border-t border-[#FED7AA]">
                        {order.total > 0 && !isEditingBill ? (
                          <View className="flex-row items-center justify-between bg-white p-2.5 rounded-xl border border-[#FED7AA]">
                            <View className="flex-row items-center">
                              <MaterialIcons name="receipt-long" size={18} color="#EA580C" />
                              <View className="ml-2">
                                <Text className="text-[10px] font-bold text-[#9A3412] uppercase">
                                  Confirmed Bill Amount
                                </Text>
                                <Text className="text-sm font-black text-[#EA580C]">
                                  {money(order.total)} (Saved ✓)
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setBillInputs((prev) => ({ ...prev, [order.id]: String(order.total) }));
                                setEditingBillOrderIds((prev) => ({ ...prev, [order.id]: true }));
                              }}
                              className="flex-row items-center px-3 py-1.5 rounded-lg bg-[#FFF7ED] border border-[#FED7AA]"
                            >
                              <MaterialIcons name="edit" size={13} color="#EA580C" />
                              <Text className="text-[11px] font-black text-[#EA580C] ml-1">
                                Edit Bill
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View>
                            <View className="flex-row items-center justify-between mb-1.5">
                              <Text className="text-xs font-black text-[#7C2D12]">
                                Enter Bill Amount (₹):
                              </Text>
                              {order.total > 0 && (
                                <TouchableOpacity
                                  onPress={() => setEditingBillOrderIds((prev) => ({ ...prev, [order.id]: false }))}
                                >
                                  <Text className="text-xs font-bold text-muted underline">Cancel</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            <View className="flex-row items-center gap-2">
                              <View className="flex-1 flex-row items-center rounded-xl bg-white border border-[#FDBA74] px-3 py-1.5 shadow-sm">
                                <Text className="text-sm font-black text-[#EA580C] mr-1">₹</Text>
                                <TextInput
                                  value={billInputs[order.id] ?? (order.total > 0 ? String(order.total) : "")}
                                  onChangeText={(text) => setBillInputs((prev) => ({ ...prev, [order.id]: text }))}
                                  placeholder="Enter amount (e.g. 450)"
                                  placeholderTextColor="#9CA3AF"
                                  keyboardType="numeric"
                                  className="flex-1 text-sm font-bold text-foreground py-0.5"
                                />
                              </View>

                              <TouchableOpacity
                                onPress={() => handleSaveBill(order)}
                                disabled={savingOrderIds[order.id]}
                                activeOpacity={0.8}
                                className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-[#EA580C] shadow-sm"
                              >
                                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                                <Text className="text-xs font-black text-white ml-1">
                                  {savingOrderIds[order.id] ? "Saving..." : "Save Bill"}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            <Text className="text-[10px] text-[#9A3412] mt-1.5 font-medium">
                              Save karte hi yeh input band ho jayega aur bill customer ko live update ho jayega.
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    /* Standard Order Items Preview */
                    <View className="mb-3 bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <Text className="text-[10px] font-black text-muted uppercase tracking-wider mb-1.5">
                        Ordered Items
                      </Text>
                      {order.items.slice(0, 5).map((item, idx) => (
                        <View key={idx} className="flex-row justify-between py-0.5">
                          <Text className="text-xs text-foreground font-medium" numberOfLines={1}>
                            {item.quantity}x {item.productName || "Item"}
                          </Text>
                          <Text className="text-xs text-muted font-bold">
                            {money((item.unitPrice || 0) * item.quantity)}
                          </Text>
                        </View>
                      ))}
                      {order.items.length > 5 && (
                        <Text className="text-[10px] text-muted italic mt-0.5">
                          +{order.items.length - 5} more items
                        </Text>
                      )}
                      {order.items.length === 0 && (
                        <Text className="text-xs text-muted italic py-0.5">
                          No item list specified
                        </Text>
                      )}
                      {order.note ? (
                        <Text className="text-[11px] text-muted italic mt-1 pt-1 border-t border-[#E5E7EB]">
                          Note: {order.note}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {/* Action Buttons Footer */}
                  <View className="flex-row items-center justify-between border-t border-border pt-2.5">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      {/* WhatsApp Bill Action */}
                      <TouchableOpacity
                        onPress={() => sendWhatsAppBill(order)}
                        className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6]"
                      >
                        <FontAwesome name="whatsapp" size={14} color="#176B45" />
                        <Text className="text-[11px] font-bold text-[#176B45] ml-1.5">
                          Bill
                        </Text>
                      </TouchableOpacity>

                      {/* Cancel Order Action */}
                      {order.status !== "Delivered" && order.status !== "Cancelled" && (
                        <TouchableOpacity
                          onPress={() => onCancelOrder?.(order)}
                          className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3]"
                        >
                          <MaterialIcons name="cancel" size={14} color="#BE123C" />
                          <Text className="text-[11px] font-bold text-[#BE123C] ml-1">
                            Cancel Order
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Delivered Status Badge */}
                      {order.status === "Delivered" && (
                        <View className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                          <MaterialIcons name="check-circle" size={14} color="#047857" />
                          <Text className="text-[10px] font-bold text-[#047857] ml-1">
                            Delivered (Locked)
                          </Text>
                        </View>
                      )}

                      {/* Cancelled Status Badge */}
                      {order.status === "Cancelled" && (
                        <View className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5]">
                          <MaterialIcons name="cancel" size={14} color="#DC2626" />
                          <Text className="text-[10px] font-bold text-[#DC2626] ml-1">
                            Cancelled (Locked)
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Progress Status Button */}
                    {nextStatus && (
                      <TouchableOpacity
                        onPress={() => onUpdateStatus(order, nextStatus)}
                        activeOpacity={0.85}
                        className="flex-row items-center px-3 py-1.5 rounded-xl bg-primary"
                      >
                        <Text className="text-xs font-bold text-white mr-1">
                          Mark as {nextStatus}
                        </Text>
                        <MaterialIcons name="chevron-right" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
