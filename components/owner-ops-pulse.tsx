import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { money, type Order } from "@/lib/niv-store";

export function OwnerOpsPulse({ orders, lowStock, todaySales }: { orders: Order[]; lowStock: number; todaySales: number }) {
  const newOrders = orders.filter((order) => order.status === "New").length;
  const deliveryOrders = orders.filter((order) => order.status === "Out for delivery").length;
  const progress = Math.min(100, Math.round((orders.filter((order) => order.status === "Delivered").length / Math.max(orders.length, 1)) * 100));
  const primaryAction = newOrders > 0 ? `${newOrders} order${newOrders > 1 ? "s" : ""} need packing` : lowStock > 0 ? `${lowStock} product${lowStock > 1 ? "s" : ""} need restocking` : "Today’s queue is on track";

  return <View className="rounded-3xl bg-foreground p-5 mt-4 overflow-hidden"><View className="absolute h-32 w-32 rounded-full bg-[#A7D948] opacity-20 right-[-28px] top-[-28px]" /><View className="flex-row items-center justify-between"><View><Text className="text-[11px] tracking-widest font-bold text-[#DDF7A0]">OPERATIONS PULSE</Text><Text className="text-lg font-extrabold text-background mt-2">{primaryAction}</Text></View><View className="h-11 w-11 rounded-2xl bg-[#294737] items-center justify-center"><MaterialIcons name="bolt" size={22} color="#A7D948" /></View></View><View className="flex-row mt-5"><PulseStat label="To pack" value={String(newOrders)} /><PulseStat label="On route" value={String(deliveryOrders)} /><PulseStat label="Fulfilled" value={`${progress}%`} /></View><View className="rounded-2xl bg-[#294737] px-4 py-3 mt-5 flex-row justify-between items-center"><Text className="text-xs text-[#D6E2D9]">Verified sales today</Text><Text className="text-sm font-extrabold text-background">{money(todaySales)}</Text></View></View>;
}

function PulseStat({ label, value }: { label: string; value: string }) {
  return <View className="flex-1"><Text className="text-xl font-extrabold text-background">{value}</Text><Text className="text-[11px] text-[#B7C9BC] mt-1">{label}</Text></View>;
}
