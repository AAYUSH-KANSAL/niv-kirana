import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Text, TouchableOpacity, View } from "react-native";

export function OwnerVoiceMessage({ audioUri }: { audioUri: string }) {
  const player = useAudioPlayer(audioUri);
  const playerStatus = useAudioPlayerStatus(player);

  const togglePlayback = () => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish) player.seekTo(0);
    player.play();
  };

  return <View className="rounded-2xl bg-[#EFF7E2] border border-[#CFE6B6] p-3 mt-3"><View className="flex-row items-center"><MaterialIcons name="record-voice-over" size={17} color="#176B45" /><Text className="text-[10px] font-extrabold tracking-wider text-primary ml-2">VOICE ORDER RECORDING</Text></View><TouchableOpacity accessibilityLabel={playerStatus.playing ? "Pause customer voice message" : "Play customer voice message"} onPress={togglePlayback} activeOpacity={0.82} className="flex-row items-center justify-center rounded-2xl bg-primary py-3 mt-3"><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={19} color="#FFF9EF" /><Text className="ml-2 text-xs font-extrabold text-background">{playerStatus.playing ? "Pause voice message" : "Play customer voice message"}</Text></TouchableOpacity><Text className="text-[11px] leading-4 text-muted mt-2">Recording सुनकर customer के लिए items और bill तैयार करें।</Text></View>;
}
