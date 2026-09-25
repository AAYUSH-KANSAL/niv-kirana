import { MaterialIcons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";

export function VoiceOrderRecorder({ onReady }: { onReady: (audioUri: string) => Promise<void> }) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [draftAudioUri, setDraftAudioUri] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const player = useAudioPlayer(draftAudioUri);
  const playerStatus = useAudioPlayerStatus(player);

  const beginRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission", "Voice Order भेजने के लिए microphone permission allow करें।");
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("Voice Order", "Recording शुरू नहीं हुई। कृपया फिर से कोशिश करें।");
    }
  };

  const finishRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        Alert.alert("Voice Order", "Recording save नहीं हुई। कृपया फिर से record करें।");
        return;
      }
      setDraftAudioUri(uri);
    } catch {
      Alert.alert("Voice Order", "Recording save नहीं हुई। कृपया फिर से record करें।");
    }
  };

  const togglePreviewPlayback = () => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish) player.seekTo(0);
    player.play();
  };

  const discardDraft = () => {
    player.pause();
    player.seekTo(0);
    setDraftAudioUri(null);
  };

  const sendVoiceOrder = async () => {
    if (!draftAudioUri || isSending) return;
    setIsSending(true);
    try {
      await onReady(draftAudioUri);
      player.pause();
      player.seekTo(0);
      setDraftAudioUri(null);
    } catch {
      Alert.alert("Voice Order", "Voice Order भेजा नहीं जा सका। कृपया फिर से कोशिश करें।");
    } finally {
      setIsSending(false);
    }
  };

  return <View className="rounded-2xl border border-[#CFE6B6] bg-[#EFF7E2] p-4 mt-4">{draftAudioUri ? <View className="rounded-2xl bg-background border border-[#CFE6B6] p-3 mt-4"><TouchableOpacity accessibilityLabel="Play recorded voice order" onPress={togglePreviewPlayback} activeOpacity={0.82} className="flex-row items-center justify-center rounded-xl bg-surface border border-border py-3"><MaterialIcons name={playerStatus.playing ? "pause" : "play-arrow"} size={20} color="#176B45" /><Text className="ml-2 text-sm font-extrabold text-primary">{playerStatus.playing ? "Pause recording" : "Play recording"}</Text></TouchableOpacity><View className="flex-row mt-3"><TouchableOpacity accessibilityLabel="Discard voice recording" onPress={discardDraft} disabled={isSending} activeOpacity={0.78} className="flex-1 flex-row items-center justify-center rounded-xl border border-border bg-surface py-3 mr-2"><MaterialIcons name="delete-outline" size={18} color="#176B45"/><Text className="ml-1 text-xs font-extrabold text-primary">Discard</Text></TouchableOpacity><TouchableOpacity accessibilityLabel="Send voice order" onPress={() => void sendVoiceOrder()} disabled={isSending} activeOpacity={0.78} className={`flex-[1.35] flex-row items-center justify-center rounded-xl py-3 ${isSending ? "bg-[#779886]" : "bg-primary"}`}><MaterialIcons name="send" size={18} color="#FFF9EF"/><Text className="ml-2 text-xs font-extrabold text-background">{isSending ? "Sending..." : "Send voice order"}</Text></TouchableOpacity></View></View> : <TouchableOpacity accessibilityLabel={recorderState.isRecording ? "Stop voice recording" : "Start voice recording"} onPress={() => void (recorderState.isRecording ? finishRecording() : beginRecording())} activeOpacity={0.82} className={`flex-row items-center justify-center rounded-2xl py-3.5 mt-4 ${recorderState.isRecording ? "bg-[#A13C32]" : "bg-primary"}`}><MaterialIcons name={recorderState.isRecording ? "stop-circle" : "mic"} size={19} color="#FFF9EF" /><Text className="ml-2 text-sm font-extrabold text-background">{recorderState.isRecording ? "Stop recording" : "Start voice order"}</Text></TouchableOpacity>}</View>;
}
