import { MaterialIcons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Text, TouchableOpacity } from "react-native";

import { trpc } from "@/lib/trpc";

export function VoiceSearchButton({ onText }: { onText: (text: string) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const transcribe = trpc.niv.transcribeSearchVoice.useMutation();

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission", "Voice search के लिए microphone permission allow करें।");
      return;
    }
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("Voice search", "Microphone शुरू नहीं हुआ। कृपया फिर से कोशिश करें।");
    }
  };

  const stopAndSearch = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("Recording save नहीं हुई");
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const result = await transcribe.mutateAsync({ audioDataUrl: `data:audio/m4a;base64,${base64}` });
      if (!result.text) throw new Error("Spoken search समझ नहीं आया");
      onText(result.text);
    } catch (error) {
      Alert.alert("Voice search", error instanceof Error ? error.message : "Voice search पूरा नहीं हुआ।");
    }
  };

  const active = recorderState.isRecording;
  const loading = transcribe.isPending;
  return <TouchableOpacity accessibilityLabel={active ? "Voice search रोकें" : "Voice search शुरू करें"} onPress={() => void (active ? stopAndSearch() : start())} disabled={loading} activeOpacity={0.75} className={`h-10 min-w-10 px-2 rounded-xl items-center justify-center ${active ? "bg-[#A13C32]" : "bg-[#EAF4D9]"}`}>
    <MaterialIcons name={loading ? "hourglass-top" : active ? "stop" : "mic"} size={20} color={active ? "#FFF9EF" : "#176B45"} />
    {active ? <Text className="text-[9px] font-bold text-background mt-0.5">Stop</Text> : null}
  </TouchableOpacity>;
}
