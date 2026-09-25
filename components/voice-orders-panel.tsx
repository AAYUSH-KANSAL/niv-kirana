import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { readVoiceOrders, type VoiceOrder, type VoiceOrderStatus, updateVoiceOrderStatus } from "@/lib/voice-orders";
import { orderDateLabel } from "@/shared/customer-database";

export function VoiceOrdersPanel() {
  const [orders, setOrders] = useState<VoiceOrder[]>([]);
  const loadOrders = useCallback(() => { void readVoiceOrders().then(setOrders); }, []);
  useEffect(() => { loadOrders(); }, [loadOrders]);
  if (!orders.length) return null;
  return <View className="mb-6"><View className="flex-row items-center justify-between mb-3"><View><Text className="text-base font-extrabold text-foreground">Voice orders</Text><Text className="text-xs text-muted mt-1">Customer की recording सुनें और bill confirm करें</Text></View><View className="rounded-full bg-[#EAF4D9] px-3 py-1"><Text className="text-xs font-extrabold text-primary">{orders.length}</Text></View></View>{orders.map((order) => <VoiceOrderCard key={order.id} order={order} onStatusChanged={loadOrders} />)}</View>;
}

function VoiceOrderCard({ order, onStatusChanged }: { order: VoiceOrder; onStatusChanged: () => void }) {
  const player = useAudioPlayer(order.audioUri);
  const playerStatus = useAudioPlayerStatus(player);
  const changeStatus = async (status: VoiceOrderStatus) => { await updateVoiceOrderStatus(order.id, status); onStatusChanged(); };
  const togglePlayback = () => { if (playerStatus.playing) player.pause(); else { if (playerStatus.didJustFinish) player.seekTo(0); player.play(); } };
  return <View className="rounded-3xl border border-[#CFE6B6] bg-[#EFF7E2] p-4 mb-3"><View className="flex-row items-start"><View className="h-11 w-11 rounded-2xl bg-background items-center justify-center"><MaterialIcons name="record-voice-over" size={23} color="#176B45" /></View><View className="flex-1 ml-3"><Text className="text-sm font-extrabold text-foreground">{order.customer.name || "Customer"}</Text><Text className="text-xs font-bold text-primary mt-0.5">{order.customer.phone || "Phone not added"}</Text><Text className="text-[11px] text-muted mt-1">{order.id} · {orderDateLabel(order.createdAt)}</Text></View><View className="rounded-full bg-background px-3 py-1"><Text className="text-[10px] font-extrabold text-primary">{order.status}</Text></View></View><TouchableOpacity onPress={togglePlayback} activeOpacity={0.82} className="flex-row items-center justify-center rounded-2xl bg-primary py-3 mt-4"><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={20} color="#FFF9EF" /><Text className="ml-2 text-sm font-extrabold text-background">{playerStatus.playing ? "Pause voice message" : "Play customer voice message"}</Text></TouchableOpacity><Text className="text-xs leading-5 text-muted mt-3">{order.customer.address || "Delivery address not added"}</Text><View className="flex-row flex-wrap mt-3">{(["Received", "Bill being prepared", "Confirmed"] as VoiceOrderStatus[]).map((status) => <TouchableOpacity key={status} onPress={() => void changeStatus(status)} className={`rounded-full px-3 py-2 mr-2 mb-2 ${order.status === status ? "bg-primary" : "bg-background border border-border"}`}><Text className={`text-[10px] font-bold ${order.status === status ? "text-background" : "text-muted"}`}>{status}</Text></TouchableOpacity>)}</View></View>;
}
