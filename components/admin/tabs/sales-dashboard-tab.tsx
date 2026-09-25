import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { money } from "@/lib/niv-store";
import type { Product } from "@/lib/niv-store";
import type { OwnerOrder } from "@/shared/owner-order-routing";

interface SalesDashboardTabProps {
  orders: OwnerOrder[];
  products?: Product[];
  onNavigateTab?: (tab: any) => void;
}

type PeriodFilter = "today" | "7days" | "month" | "all";
type ChartMode = "daily" | "monthly";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SalesDashboardTab({ orders, products, onNavigateTab }: SalesDashboardTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>("7days");
  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Filter orders by selected period strictly from actual orders
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return orders.filter((o) => {
      if (!o.createdAt) return true;
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;
      const diffMs = now.getTime() - orderDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (period === "today") {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        ) || diffDays < 1;
      }
      if (period === "7days") {
        return diffDays <= 7;
      }
      if (period === "month") {
        return diffDays <= 30;
      }
      return true; // "all"
    });
  }, [orders, period]);

  // Aggregate Key Metrics strictly from real filteredOrders
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const deliveredOrders = filteredOrders.filter((o) => o.status === "Delivered");
    const activeOrders = filteredOrders.filter(
      (o) => o.status === "New" || o.status === "Packed" || o.status === "Out for delivery"
    );
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Real payment methods breakdown
    let upiTotal = 0;
    let cashTotal = 0;
    let khataTotal = 0;

    filteredOrders.forEach((o) => {
      const method = String(o.payment || "").toLowerCase();
      if (method.includes("khata") || method.includes("credit")) {
        khataTotal += o.total || 0;
      } else if (method.includes("cash") || method.includes("cod") || method.includes("purchasing")) {
        cashTotal += o.total || 0;
      } else if (method.includes("upi")) {
        upiTotal += o.total || 0;
      } else {
        cashTotal += o.total || 0;
      }
    });

    return {
      totalOrders,
      totalRevenue,
      deliveredOrdersCount: deliveredOrders.length,
      activeOrdersCount: activeOrders.length,
      averageOrderValue,
      upiTotal,
      cashTotal,
      khataTotal,
    };
  }, [filteredOrders]);

  // Repeat customer analysis from actual orders
  const customerStats = useMemo(() => {
    const customerOrderCounts = new Map<string, number>();
    filteredOrders.forEach((o) => {
      const customerKey =
        o.customer?.phone || o.customer?.name || o.accountId || "unknown";
      customerOrderCounts.set(
        customerKey,
        (customerOrderCounts.get(customerKey) || 0) + 1
      );
    });

    const totalUniqueCustomers = customerOrderCounts.size;
    const repeatCustomers = Array.from(customerOrderCounts.values()).filter(
      (c) => c > 1
    ).length;
    const repeatRate =
      totalUniqueCustomers > 0
        ? Math.round((repeatCustomers / totalUniqueCustomers) * 100)
        : 0;

    return {
      totalUniqueCustomers,
      repeatCustomers,
      repeatRate,
    };
  }, [filteredOrders]);

  // Real Daily Chart Data for the last 7 days (No fake weights)
  const dailyChartData = useMemo(() => {
    const days: { dateStr: string; label: string; amount: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = DAY_NAMES[d.getDay()] || "Day";
      const dayNum = d.getDate();

      const dayOrders = orders.filter((o) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        if (isNaN(oDate.getTime())) return false;
        return (
          oDate.getFullYear() === d.getFullYear() &&
          oDate.getMonth() === d.getMonth() &&
          oDate.getDate() === d.getDate()
        );
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      days.push({
        dateStr,
        label: `${dayLabel} ${dayNum}`,
        amount: dayRevenue,
        count: dayOrders.length,
      });
    }

    return days;
  }, [orders]);

  // Real Monthly Chart Data: grouped strictly by actual month of order creation
  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const months: { name: string; shortName: string; amount: number; count: number; year: number; month: number }[] = [];

    // Show the last 4 calendar months ending at current month
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const name = `${MONTH_NAMES[m]} ${y}`;
      const shortName = MONTH_NAMES[m];

      // Match orders created in this specific calendar month and year
      const matching = orders.filter((o) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        if (isNaN(oDate.getTime())) return false;
        return oDate.getFullYear() === y && oDate.getMonth() === m;
      });

      const amount = matching.reduce((sum, o) => sum + (o.total || 0), 0);

      months.push({
        name,
        shortName,
        amount,
        count: matching.length,
        year: y,
        month: m,
      });
    }

    return months;
  }, [orders]);

  // Max value for daily bar chart scaling
  const maxDailyAmount = useMemo(() => {
    const max = Math.max(...dailyChartData.map((d) => d.amount), 0);
    return max > 0 ? max : 1;
  }, [dailyChartData]);

  // Max value for monthly bar chart scaling
  const maxMonthlyAmount = useMemo(() => {
    const max = Math.max(...monthlyChartData.map((m) => m.amount), 0);
    return max > 0 ? max : 1;
  }, [monthlyChartData]);

  // Top Selling Items strictly aggregated from actual orders
  const topProducts = useMemo(() => {
    const itemMap = new Map<string, { name: string; units: number; revenue: number; category: string }>();

    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.productName || item.productId || "Grocery Item";
        const qty = item.quantity || 1;
        const price = item.unitPrice || 0;
        const category =
          (item as any).category ||
          products?.find((p) => p.id === item.productId)?.category ||
          "Grocery";

        const existing = itemMap.get(name);
        if (existing) {
          existing.units += qty;
          existing.revenue += price * qty;
        } else {
          itemMap.set(name, {
            name,
            units: qty,
            revenue: price * qty,
            category,
          });
        }
      });
    });

    const sorted = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
    return sorted.slice(0, 5);
  }, [filteredOrders, products]);

  // Real Order status funnel counts
  const statusFunnel = useMemo(() => {
    const delivered = filteredOrders.filter((o) => o.status === "Delivered").length;
    const outForDelivery = filteredOrders.filter((o) => o.status === "Out for delivery").length;
    const packed = filteredOrders.filter((o) => o.status === "Packed").length;
    const pending = filteredOrders.filter(
      (o) => o.status === "New" || o.status === "Payment pending"
    ).length;
    const cancelled = filteredOrders.filter((o) => o.status === "Cancelled").length;

    const total = filteredOrders.length;

    return [
      { label: "Delivered", count: delivered, pct: total > 0 ? Math.round((delivered / total) * 100) : 0, color: "#176B45", bg: "#EAF4D9" },
      { label: "Out for Delivery", count: outForDelivery, pct: total > 0 ? Math.round((outForDelivery / total) * 100) : 0, color: "#D97706", bg: "#FEF3C7" },
      { label: "Packed / Ready", count: packed, pct: total > 0 ? Math.round((packed / total) * 100) : 0, color: "#125436", bg: "#D2E9D7" },
      { label: "New Orders", count: pending, pct: total > 0 ? Math.round((pending / total) * 100) : 0, color: "#176B45", bg: "#EAF4D9" },
      { label: "Cancelled", count: cancelled, pct: total > 0 ? Math.round((cancelled / total) * 100) : 0, color: "#5C6E63", bg: "#FAF8F5" },
    ];
  }, [filteredOrders]);

  const selectedDay =
    selectedDayIndex !== null && selectedDayIndex >= 0 && selectedDayIndex < dailyChartData.length
      ? dailyChartData[selectedDayIndex]
      : null;

  const selectedMonth =
    selectedMonthIndex !== null && selectedMonthIndex >= 0 && selectedMonthIndex < monthlyChartData.length
      ? monthlyChartData[selectedMonthIndex]
      : null;

  return (
    <View className="space-y-4">
      {/* Sales Header Card */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <View className="flex-row items-center">
              <View className="h-6 px-2 rounded-full bg-[#EAF4D9] items-center justify-center mr-2">
                <Text className="text-[10px] font-black text-[#176B45] uppercase tracking-wider">
                  Live Analytics
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="h-2 w-2 rounded-full bg-[#176B45] mr-1.5" />
                <Text className="text-xs font-semibold text-[#5C6E63]">
                  Kuchesar Road Chopla Hub
                </Text>
              </View>
            </View>
            <Text className="text-xl font-black text-[#14221B] mt-1.5">
              Sales & Revenue Dashboard
            </Text>
          </View>

          <View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] items-center justify-center">
            <MaterialIcons name="insights" size={22} color="#176B45" />
          </View>
        </View>

        {/* Time Period Filter Chips */}
        <View className="flex-row items-center mt-3 pt-3 border-t border-[#E2E8D8] gap-1.5">
          {(
            [
              { id: "today", label: "Today" },
              { id: "7days", label: "Last 7 Days" },
              { id: "month", label: "This Month" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((item) => {
            const active = period === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  setPeriod(item.id);
                  setSelectedDayIndex(null);
                  setSelectedMonthIndex(null);
                }}
                className={`flex-1 py-1.5 rounded-xl items-center border ${
                  active
                    ? "bg-[#176B45] border-[#176B45]"
                    : "bg-[#FAF8F5] border-[#E2E8D8]"
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    active ? "text-white" : "text-[#5C6E63]"
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View className="flex-row flex-wrap gap-2.5">
        {/* Gross Revenue */}
        <View className="flex-1 min-w-[150px] rounded-2xl bg-[#EAF4D9] border border-[#CFE6B6] p-3.5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#176B45]">
              Total Revenue
            </Text>
            <View className="h-6 w-6 rounded-lg bg-white items-center justify-center">
              <MaterialIcons name="trending-up" size={14} color="#176B45" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#14221B]">
            {money(metrics.totalRevenue)}
          </Text>
          <View className="flex-row items-center mt-1">
            <MaterialIcons name="shopping-bag" size={12} color="#176B45" />
            <Text className="text-[10px] font-bold text-[#176B45] ml-0.5">
              {metrics.totalOrders} {metrics.totalOrders === 1 ? "order" : "orders"}
            </Text>
            <Text className="text-[10px] text-[#5C6E63] ml-1">in selected view</Text>
          </View>
        </View>

        {/* Orders Volume */}
        <View className="flex-1 min-w-[150px] rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] p-3.5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#24963F]">
              Total Orders
            </Text>
            <View className="h-6 w-6 rounded-lg bg-white items-center justify-center">
              <MaterialIcons name="shopping-bag" size={14} color="#24963F" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#1C1C1C]">
            {metrics.totalOrders}
          </Text>
          <Text className="text-[10px] text-[#24963F] mt-1 font-semibold">
            {metrics.deliveredOrdersCount} delivered · {metrics.activeOrdersCount} live
          </Text>
        </View>

        {/* Average Order Value (AOV) */}
        <View className="flex-1 min-w-[150px] rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] p-3.5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB]">
              Avg Order Value
            </Text>
            <View className="h-6 w-6 rounded-lg bg-white items-center justify-center">
              <MaterialIcons name="receipt" size={14} color="#2563EB" />
            </View>
          </View>
          <Text className="text-2xl font-black text-[#1C1C1C]">
            {money(metrics.averageOrderValue)}
          </Text>
          <Text className="text-[10px] text-[#686B78] mt-1 font-medium">
            Per confirmed customer order
          </Text>
        </View>

        {/* NIV Khata & UPI Split */}
        <View className="flex-1 min-w-[150px] rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] p-3.5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-wider text-[#D97706]">
              Payment Mix
            </Text>
            <View className="h-6 w-6 rounded-lg bg-white items-center justify-center">
              <MaterialIcons name="payments" size={14} color="#D97706" />
            </View>
          </View>
          <Text className="text-sm font-black text-[#1C1C1C]">
            UPI: {money(metrics.upiTotal)}
          </Text>
          <Text className="text-[10px] text-[#686B78] mt-1 font-medium">
            Cash: {money(metrics.cashTotal)} · Khata: {money(metrics.khataTotal)}
          </Text>
        </View>
      </View>

      {/* Visual Chart Card */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        {/* Chart Header & Mode Toggle */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-sm font-black text-[#14221B]">
              {chartMode === "daily" ? "Daily Sales Trend (₹)" : "Monthly Revenue Trend (₹)"}
            </Text>
            <Text className="text-[11px] text-[#5C6E63] mt-0.5">
              {chartMode === "daily"
                ? "Tap any bar to inspect daily orders & revenue"
                : "Real month-on-month store revenue"}
            </Text>
          </View>

          <View className="flex-row rounded-xl bg-[#FAF8F5] p-0.5 border border-[#E2E8D8]">
            <TouchableOpacity
              onPress={() => {
                setChartMode("daily");
                setSelectedDayIndex(null);
                setSelectedMonthIndex(null);
              }}
              className={`px-2.5 py-1 rounded-lg ${
                chartMode === "daily" ? "bg-white border border-[#E2E8D8]" : ""
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  chartMode === "daily" ? "text-[#176B45]" : "text-[#5C6E63]"
                }`}
              >
                Daily
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setChartMode("monthly");
                setSelectedDayIndex(null);
                setSelectedMonthIndex(null);
              }}
              className={`px-2.5 py-1 rounded-lg ${
                chartMode === "monthly" ? "bg-white border border-[#E2E8D8]" : ""
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  chartMode === "monthly" ? "text-[#176B45]" : "text-[#5C6E63]"
                }`}
              >
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visual Bar Chart */}
        {chartMode === "daily" ? (
          <View>
            <View className="h-44 flex-row items-end justify-between pt-6 pb-2 px-1">
              {dailyChartData.map((item, index) => {
                const heightPercent =
                  maxDailyAmount > 0 && item.amount > 0
                    ? Math.max(12, Math.round((item.amount / maxDailyAmount) * 100))
                    : 0;
                const isSelected = selectedDayIndex === index;
                const isHighest = item.amount === maxDailyAmount && maxDailyAmount > 0;

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    onPress={() => setSelectedDayIndex(isSelected ? null : index)}
                    activeOpacity={0.8}
                    className="flex-1 items-center mx-1 group"
                  >
                    {/* Amount Label on Top */}
                    <Text
                      className={`text-[9px] font-black mb-1.5 ${
                        isSelected || isHighest ? "text-[#176B45]" : "text-[#5C6E63]"
                      }`}
                      numberOfLines={1}
                    >
                      {item.amount === 0
                        ? "₹0"
                        : item.amount >= 1000
                        ? `₹${(item.amount / 1000).toFixed(1)}k`
                        : `₹${item.amount}`}
                    </Text>

                    {/* Chart Bar */}
                    <View className="w-full max-w-[28px] h-28 bg-[#FAF8F5] rounded-t-xl overflow-hidden justify-end">
                      {heightPercent > 0 ? (
                        <View
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl ${
                            isSelected
                              ? "bg-[#125436]"
                              : isHighest
                              ? "bg-[#176B45]"
                              : "bg-[#97C49F]"
                          }`}
                        />
                      ) : null}
                    </View>

                    {/* Day / Date Label */}
                    <Text
                      className={`text-[9px] mt-2 font-bold text-center ${
                        isSelected ? "text-[#176B45]" : "text-[#5C6E63]"
                      }`}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Day Details Panel */}
            {selectedDay ? (
              <View className="mt-3 p-3 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-black text-[#14221B]">
                    {selectedDay.label} Breakdown
                  </Text>
                  <Text className="text-[11px] text-[#5C6E63] mt-0.5">
                    {selectedDay.count} order{selectedDay.count === 1 ? "" : "s"} · Average ticket ₹
                    {selectedDay.count > 0
                      ? Math.round(selectedDay.amount / selectedDay.count)
                      : 0}
                  </Text>
                </View>
                <Text className="text-base font-black text-[#176B45]">
                  {money(selectedDay.amount)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          /* Monthly Bar Chart */
          <View>
            <View className="h-44 flex-row items-end justify-between pt-6 pb-2 px-3">
              {monthlyChartData.map((item, index) => {
                const heightPercent =
                  maxMonthlyAmount > 0 && item.amount > 0
                    ? Math.max(16, Math.round((item.amount / maxMonthlyAmount) * 100))
                    : 0;
                const isCurrentMonth = index === monthlyChartData.length - 1;
                const isSelected = selectedMonthIndex === index;

                return (
                  <TouchableOpacity
                    key={item.name}
                    onPress={() => setSelectedMonthIndex(isSelected ? null : index)}
                    activeOpacity={0.8}
                    className="flex-1 items-center mx-2"
                  >
                    <Text
                      className={`text-[10px] font-black mb-1.5 ${
                        isSelected || isCurrentMonth ? "text-[#176B45]" : "text-[#5C6E63]"
                      }`}
                    >
                      {item.amount === 0
                        ? "₹0"
                        : item.amount >= 1000
                        ? `₹${(item.amount / 1000).toFixed(1)}k`
                        : `₹${item.amount}`}
                    </Text>

                    <View className="w-full max-w-[40px] h-28 bg-[#FAF8F5] rounded-t-xl overflow-hidden justify-end">
                      {heightPercent > 0 ? (
                        <View
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl ${
                            isSelected
                              ? "bg-[#125436]"
                              : isCurrentMonth
                              ? "bg-[#176B45]"
                              : "bg-[#97C49F]"
                          }`}
                        />
                      ) : null}
                    </View>

                    <Text
                      className={`text-[10px] mt-2 font-bold ${
                        isSelected || isCurrentMonth ? "text-[#176B45]" : "text-[#5C6E63]"
                      }`}
                    >
                      {item.shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Month Details Panel */}
            {selectedMonth ? (
              <View className="mt-3 p-3 rounded-xl bg-[#EAF4D9] border border-[#CFE6B6] flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-black text-[#14221B]">
                    {selectedMonth.name} Overview
                  </Text>
                  <Text className="text-[11px] text-[#5C6E63] mt-0.5">
                    {selectedMonth.count} monthly order{selectedMonth.count === 1 ? "" : "s"} · Kuchesar hub
                  </Text>
                </View>
                <Text className="text-base font-black text-[#176B45]">
                  {money(selectedMonth.amount)}
                </Text>
              </View>
            ) : (
              <View className="mt-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8] flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <MaterialIcons name="trending-up" size={16} color="#176B45" />
                  <Text className="text-xs font-bold text-[#14221B] ml-1.5">
                    Current Month Sales
                  </Text>
                </View>
                <Text className="text-xs font-black text-[#176B45]">
                  {money(monthlyChartData[monthlyChartData.length - 1]?.amount || 0)} (
                  {monthlyChartData[monthlyChartData.length - 1]?.count || 0} orders)
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Order Fulfillment Funnel */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-sm font-black text-[#14221B]">
              Order Fulfillment Pipeline
            </Text>
            <Text className="text-[11px] text-[#5C6E63] mt-0.5">
              Live status of orders ({filteredOrders.length} total)
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onNavigateTab?.("Orders")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-bold text-[#176B45] mr-0.5">View Orders</Text>
            <MaterialIcons name="chevron-right" size={16} color="#176B45" />
          </TouchableOpacity>
        </View>

        <View className="space-y-2.5">
          {statusFunnel.map((item) => (
            <View key={item.label}>
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center">
                  <View
                    style={{ backgroundColor: item.color }}
                    className="h-2 w-2 rounded-full mr-2"
                  />
                  <Text className="text-xs font-bold text-[#14221B]">{item.label}</Text>
                </View>
                <Text className="text-xs font-black text-[#14221B]">
                  {item.count} orders ({item.pct}%)
                </Text>
              </View>
              {/* Progress Track */}
              <View className="h-2 w-full bg-[#FAF8F5] rounded-full overflow-hidden">
                <View
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  className="h-full rounded-full"
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Top-Selling Products in Kuchesar */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-sm font-black text-[#14221B]">
              Top Fast-Moving Groceries
            </Text>
            <Text className="text-[11px] text-[#5C6E63] mt-0.5">
              Highest grossing items from actual orders
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onNavigateTab?.("Products")}
            className="flex-row items-center"
          >
            <Text className="text-xs font-bold text-[#176B45] mr-0.5">Inventory</Text>
            <MaterialIcons name="chevron-right" size={16} color="#176B45" />
          </TouchableOpacity>
        </View>

        {topProducts.length === 0 ? (
          <View className="py-6 items-center justify-center">
            <View className="h-10 w-10 rounded-full bg-[#FAF8F5] items-center justify-center mb-2">
              <MaterialIcons name="shopping-bag" size={20} color="#5C6E63" />
            </View>
            <Text className="text-xs font-bold text-[#14221B]">Koi sales record nahi hui</Text>
            <Text className="text-[11px] text-[#5C6E63] mt-0.5 text-center">
              Is time period me abhi tak koi items order nahi huye hain.
            </Text>
          </View>
        ) : (
          <View className="space-y-2">
            {topProducts.map((p, index) => (
              <View
                key={p.name}
                className="flex-row items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E2E8D8]"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <View
                    className={`h-6 w-6 rounded-full items-center justify-center mr-2.5 ${
                      index === 0
                        ? "bg-[#EAF4D9]"
                        : index === 1
                        ? "bg-[#EAF4D9]"
                        : "bg-[#EAF4D9]"
                    }`}
                  >
                    <Text className="text-[10px] font-black text-[#176B45]">
                      #{index + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-[#14221B]" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text className="text-[10px] text-[#5C6E63] mt-0.5">
                      {p.units} units sold · {p.category}
                    </Text>
                  </View>
                </View>

                <Text className="text-xs font-black text-[#176B45]">
                  {money(p.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Real Operational Speed Benchmarks */}
      <View className="rounded-2xl bg-white border border-[#E2E8D8] p-4">
        <Text className="text-xs font-black uppercase tracking-wider text-[#5C6E63] mb-3">
          Hyperlocal Service Level (Kuchesar Road Chopla)
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1 rounded-xl bg-[#FAF8F5] p-3 border border-[#E2E8D8] items-center">
            <MaterialIcons name="local-shipping" size={20} color="#176B45" />
            <Text className="text-base font-black text-[#14221B] mt-1">
              {metrics.activeOrdersCount}
            </Text>
            <Text className="text-[9px] text-[#5C6E63] font-bold text-center mt-0.5">
              Live In Pipeline
            </Text>
          </View>

          <View className="flex-1 rounded-xl bg-[#FAF8F5] p-3 border border-[#E2E8D8] items-center">
            <MaterialIcons name="verified" size={20} color="#176B45" />
            <Text className="text-base font-black text-[#14221B] mt-1">
              {metrics.totalOrders > 0
                ? `${Math.round((metrics.deliveredOrdersCount / metrics.totalOrders) * 100)}%`
                : "0%"}
            </Text>
            <Text className="text-[9px] text-[#5C6E63] font-bold text-center mt-0.5">
              Order Fulfillment
            </Text>
          </View>

          <View className="flex-1 rounded-xl bg-[#FAF8F5] p-3 border border-[#E2E8D8] items-center">
            <MaterialIcons name="repeat" size={20} color="#176B45" />
            <Text className="text-base font-black text-[#14221B] mt-1">
              {customerStats.totalUniqueCustomers > 0 ? `${customerStats.repeatRate}%` : "0%"}
            </Text>
            <Text className="text-[9px] text-[#5C6E63] font-bold text-center mt-0.5">
              Repeat Customers
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
