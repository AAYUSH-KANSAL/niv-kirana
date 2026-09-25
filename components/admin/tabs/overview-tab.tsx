import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { money, type Product } from "@/lib/niv-store";
import type { AdminTab } from "../admin-tabs-nav";
import type { OwnerOrder } from "@/shared/owner-order-routing";

interface OverviewTabProps {
  todaySales: number;
  ordersCount: number;
  pendingOrdersCount: number;
  lowStockProducts: Product[];
  pendingApprovalsCount: number;
  todayLiveOrders?: OwnerOrder[];
  onNavigateTab: (tab: AdminTab) => void;
  onOpenProductForm: () => void;
}

export function OverviewTab({
  todaySales,
  ordersCount,
  pendingOrdersCount,
  lowStockProducts,
  pendingApprovalsCount,
  todayLiveOrders = [],
  onNavigateTab,
  onOpenProductForm,
}: OverviewTabProps) {
  return (
    <View className="space-y-4">
      {/* KPI Cards Grid */}
      <View className="flex-row flex-wrap gap-2.5">
        {/* Today's Sales */}
        {/* Today's Sales (Live Home Display) */}
        <View className="flex-1 min-w-[150px] rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] p-4">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#176B45]">
              Today's Sales
            </Text>
            <View className="h-7 w-7 rounded-xl bg-white items-center justify-center">
              <MaterialIcons name="trending-up" size={16} color="#176B45" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#14221B]">
            {money(todaySales)}
          </Text>
          <Text className="text-[10px] text-[#176B45] mt-1 font-semibold">
            Aaj ki kul bikri
          </Text>
        </View>

        {/* Active Orders */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab("Orders")}
          className="flex-1 min-w-[150px] rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] p-4"
        >
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E40AF]">
              Live Orders
            </Text>
            <View className="h-7 w-7 rounded-xl bg-white items-center justify-center">
              <MaterialIcons name="receipt-long" size={16} color="#1E40AF" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#1E40AF]">
            {ordersCount}
          </Text>
          <Text className="text-[10px] text-[#1E3A8A] mt-1 font-medium">
            {pendingOrdersCount} awaiting fulfillment (Today)
          </Text>
        </TouchableOpacity>

        {/* Low Stock Alert */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab("Products")}
          className={`flex-1 min-w-[150px] rounded-2xl border p-4 ${
            lowStockProducts.length > 0
              ? "bg-[#FFF7ED] border-[#FED7AA]"
              : "bg-surface border-border"
          }`}
        >
          <View className="flex-row justify-between items-center mb-1.5">
            <Text
              className={`text-[11px] font-extrabold uppercase tracking-wider ${
                lowStockProducts.length > 0 ? "text-[#C2410C]" : "text-[#495A50]"
              }`}
            >
              Low Stock
            </Text>
            <View className="h-7 w-7 rounded-xl bg-white items-center justify-center">
              <MaterialIcons
                name="warning-amber"
                size={16}
                color={lowStockProducts.length > 0 ? "#C2410C" : "#495A50"}
              />
            </View>
          </View>
          <Text
            className={`text-2xl font-black ${
              lowStockProducts.length > 0 ? "text-[#C2410C]" : "text-foreground"
            }`}
          >
            {lowStockProducts.length}
          </Text>
          <Text className="text-[10px] text-muted mt-1 font-medium">
            Items under 5 units remaining
          </Text>
        </TouchableOpacity>

        {/* Customer Approvals */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab("Customers")}
          className={`flex-1 min-w-[150px] rounded-2xl border p-4 ${
            pendingApprovalsCount > 0
              ? "bg-[#FFF1F2] border-[#FECDD3]"
              : "bg-surface border-border"
          }`}
        >
          <View className="flex-row justify-between items-center mb-1.5">
            <Text
              className={`text-[11px] font-extrabold uppercase tracking-wider ${
                pendingApprovalsCount > 0 ? "text-[#BE123C]" : "text-[#495A50]"
              }`}
            >
              New Requests
            </Text>
            <View className="h-7 w-7 rounded-xl bg-white items-center justify-center">
              <MaterialIcons
                name="person-add"
                size={16}
                color={pendingApprovalsCount > 0 ? "#BE123C" : "#495A50"}
              />
            </View>
          </View>
          <Text
            className={`text-2xl font-black ${
              pendingApprovalsCount > 0 ? "text-[#BE123C]" : "text-foreground"
            }`}
          >
            {pendingApprovalsCount}
          </Text>
          <Text className="text-[10px] text-muted mt-1 font-medium">
            Customer accounts to approve
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today's Live Orders Feed Section on Home Page */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4 mt-2">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View className="h-2 w-2 rounded-full bg-[#176B45] mr-2" />
            <Text className="text-sm font-black text-[#14221B]">
              Live Orders (Today)
            </Text>
            <View className="ml-2 px-2 py-0.5 rounded-full bg-[#EAF4D9]">
              <Text className="text-[10px] font-black text-[#176B45]">
                {todayLiveOrders.length} active
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => onNavigateTab("Orders")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-bold text-[#176B45] mr-0.5">
              View All Orders
            </Text>
            <MaterialIcons name="chevron-right" size={16} color="#176B45" />
          </TouchableOpacity>
        </View>

        {todayLiveOrders.length === 0 ? (
          <View className="py-5 items-center justify-center">
            <View className="h-10 w-10 rounded-full bg-[#EAF4D9] items-center justify-center mb-2">
              <MaterialIcons name="check-circle" size={22} color="#176B45" />
            </View>
            <Text className="text-xs font-bold text-[#14221B]">
              Aaj koi pending live order nahi hai
            </Text>
            <Text className="text-[11px] text-[#5C6E63] mt-0.5 text-center">
              Naye customer orders aate hi yahan live show honge.
            </Text>
          </View>
        ) : (
          <View className="space-y-2">
            {todayLiveOrders.slice(0, 5).map((order) => (
              <TouchableOpacity
                key={order.id}
                activeOpacity={0.8}
                onPress={() => onNavigateTab("Orders")}
                className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] flex-row items-center justify-between"
              >
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center">
                    <Text className="text-xs font-black text-[#14221B]">
                      #{order.id}
                    </Text>
                    <View
                      className={`ml-2 px-2 py-0.5 rounded-full border ${
                        order.status === "New"
                          ? "bg-[#EAF4D9] border-[#CFE6B6]"
                          : order.status === "Packed"
                          ? "bg-[#F3E8FF] border-[#E9D5FF]"
                          : "bg-[#FFF7ED] border-[#FED7AA]"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-black ${
                          order.status === "New"
                            ? "text-[#176B45]"
                            : order.status === "Packed"
                            ? "text-[#6B21A8]"
                            : "text-[#C2410C]"
                        }`}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-[11px] text-[#5C6E63] mt-0.5" numberOfLines={1}>
                    {order.customer?.name || "Customer"} · {(order.items || []).length} items · {order.payment || "COD"}
                  </Text>
                </View>
                <Text className="text-xs font-black text-[#176B45]">
                  {money(order.total)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Operations Strip */}
      <View className="rounded-2xl bg-surface border border-border p-4 mt-2">
        <Text className="text-xs font-black uppercase tracking-wider text-muted mb-3">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-2">

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onNavigateTab("Basket")}
            className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6]"
          >
            <MaterialIcons name="auto-awesome" size={16} color="#176B45" />
            <Text className="text-xs font-bold text-[#176B45] ml-2">
              Smart Basket
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onOpenProductForm}
            className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-[#176B45]"
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white ml-1.5">
              Add Product
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onNavigateTab("Customers")}
            className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-surface border border-border"
          >
            <MaterialIcons name="how-to-reg" size={16} color="#5C6E63" />
            <Text className="text-xs font-bold text-foreground ml-2">
              Customer Desk
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onNavigateTab("Credit")}
            className="flex-row items-center px-3.5 py-2.5 rounded-xl bg-surface border border-border"
          >
            <MaterialIcons name="account-balance-wallet" size={16} color="#5C6E63" />
            <Text className="text-xs font-bold text-foreground ml-2">
              Khata Ledger
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Low Stock Critical Alert Box */}
      {lowStockProducts.length > 0 && (
        <View className="rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <MaterialIcons name="inventory" size={18} color="#C2410C" />
              <Text className="text-sm font-extrabold text-[#C2410C] ml-2">
                Restock Required ({lowStockProducts.length} items)
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateTab("Products")}>
              <Text className="text-xs font-bold text-[#C2410C] underline">
                View All
              </Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {lowStockProducts.slice(0, 6).map((p) => (
              <View
                key={p.id}
                className="flex-row items-center px-2.5 py-1 rounded-lg bg-white border border-[#FED7AA]"
              >
                <Text className="text-xs font-bold text-foreground">{p.name}</Text>
                <View className="ml-1.5 px-1.5 py-0.2 rounded bg-[#FFEDD5]">
                  <Text className="text-[10px] font-black text-[#C2410C]">
                    {p.stock} left
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
