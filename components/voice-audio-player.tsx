import React, { Component, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

interface VoiceAudioPlayerProps {
  audioUri?: string | null;
  title?: string;
  compact?: boolean;
  accentColor?: string;
}

function formatDuration(seconds: number = 0): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function isPlayableAudioUri(uri?: string | null): boolean {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  // Remote URLs from Supabase or CDN are supported
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  // On Web, local file:// is strictly blocked by browser security
  if (Platform.OS === "web") return false;
  // Expired Expo cache paths from previous app runs cannot be played
  if (trimmed.includes("/cache/ExperienceData/")) return false;
  if (trimmed.startsWith("file://") || trimmed.startsWith("content://")) return true;
  return false;
}

class AudioErrorBoundary extends Component<
  { children: React.ReactNode; compact?: boolean; title?: string },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("VoiceAudioPlayer error caught by boundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-row items-center rounded-xl bg-[#F5F5F5] border border-[#E0E0E0] p-2.5 my-1.5">
          <MaterialIcons name="mic-none" size={18} color="#9E9E9E" />
          <Text className="ml-2 text-xs text-muted font-medium">
            Voice recording attached with order
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Active player that only mounts and creates ExoPlayer instance when user explicitly taps Play
 */
function ActiveVoicePlayer({
  safeUri,
  title,
  compact,
  accentColor,
  onClose,
}: {
  safeUri: string;
  title: string;
  compact: boolean;
  accentColor: string;
  onClose: () => void;
}) {
  const [initError, setInitError] = useState(false);

  useEffect(() => {
    try {
      void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    } catch {
      // Non-fatal
    }
  }, []);

  const player = useAudioPlayer(safeUri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Auto-start playback on mount
    try {
      player.play();
    } catch (e) {
      console.warn("Auto-play error:", e);
      setInitError(true);
    }
  }, [player]);

  const isPlaying = status.playing;
  const isBuffering = status.isBuffering;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 0;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const togglePlayback = () => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        if (status.didJustFinish) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (e) {
      console.warn("Audio playback error:", e);
      setInitError(true);
    }
  };

  const restartPlayback = () => {
    try {
      player.seekTo(0);
      player.play();
    } catch (e) {
      console.warn("Audio seek error:", e);
    }
  };

  if (initError) {
    return (
      <View className="flex-row items-center justify-between rounded-xl bg-[#F5F5F5] border border-[#E0E0E0] p-2.5 my-1.5">
        <View className="flex-row items-center flex-1 mr-2">
          <MaterialIcons name="keyboard-voice" size={18} color="#74847A" />
          <Text className="ml-2 text-xs text-muted font-medium">
            Recording play nahi ho saki
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} className="p-1">
          <MaterialIcons name="close" size={16} color="#74847A" />
        </TouchableOpacity>
      </View>
    );
  }

  if (compact) {
    return (
      <View className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-2.5 my-1.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity
              onPress={togglePlayback}
              activeOpacity={0.8}
              className="h-8 w-8 rounded-full items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              {isBuffering ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={18}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

            <View className="ml-2.5 flex-1">
              <Text className="text-xs font-black text-foreground" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-[10px] text-muted font-semibold">
                {isPlaying ? "Playing..." : "Paused"} · {formatDuration(currentTime)} /{" "}
                {formatDuration(duration)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            {status.didJustFinish ? (
              <TouchableOpacity onPress={restartPlayback} className="p-1 mr-1">
                <MaterialIcons name="replay" size={18} color={accentColor} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} className="p-1">
              <MaterialIcons name="close" size={16} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="h-1 bg-[#DCFCE7] rounded-full mt-2 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 my-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="h-7 w-7 rounded-xl items-center justify-center mr-2"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <MaterialIcons name="record-voice-over" size={16} color={accentColor} />
          </View>
          <Text className="text-xs font-black text-[#14532D]" numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="text-[11px] font-bold text-[#15803D] mr-2">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <MaterialIcons name="close" size={16} color="#9E9E9E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Track */}
      <View className="h-1.5 bg-[#DCFCE7] rounded-full overflow-hidden mb-3">
        <View
          className="h-full rounded-full"
          style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
        />
      </View>

      {/* Controls Row */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={togglePlayback}
          activeOpacity={0.85}
          className="flex-row items-center px-3 py-1.5 rounded-xl shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color="#FFFFFF" className="mr-1.5" />
          ) : (
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={18}
              color="#FFFFFF"
              className="mr-1"
            />
          )}
          <Text className="text-xs font-black text-white ml-1">
            {isPlaying ? "Pause Recording" : status.didJustFinish ? "Play Again" : "Resume"}
          </Text>
        </TouchableOpacity>

        {currentTime > 0 && (
          <TouchableOpacity
            onPress={restartPlayback}
            className="flex-row items-center px-2.5 py-1.5 rounded-xl bg-white border border-[#BBF7D0]"
          >
            <MaterialIcons name="replay" size={14} color={accentColor} />
            <Text className="text-[11px] font-bold ml-1" style={{ color: accentColor }}>
              Restart
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Main VoiceAudioPlayer component:
 * Completely non-blocking and lazy. Never instantiates Expo audio on mount.
 */
export function VoiceAudioPlayer({
  audioUri,
  title = "Customer Voice Recording",
  compact = false,
  accentColor = "#176B45",
}: VoiceAudioPlayerProps) {
  const [isActive, setIsActive] = useState(false);
  const playable = isPlayableAudioUri(audioUri);
  const safeUri = playable && audioUri ? audioUri.trim() : null;

  if (!playable || !safeUri) {
    return (
      <View className="flex-row items-center rounded-xl bg-[#F5F5F5] border border-[#E0E0E0] p-2.5 my-1.5">
        <MaterialIcons name="keyboard-voice" size={18} color="#74847A" />
        <Text className="ml-2 text-xs text-muted font-medium">
          Voice order recorded · Owner items aur bill confirm karega
        </Text>
      </View>
    );
  }

  if (isActive) {
    return (
      <AudioErrorBoundary compact={compact} title={title}>
        <ActiveVoicePlayer
          safeUri={safeUri}
          title={title}
          compact={compact}
          accentColor={accentColor}
          onClose={() => setIsActive(false)}
        />
      </AudioErrorBoundary>
    );
  }

  // Idle state: Clean, lightweight button. 0 native overhead.
  if (compact) {
    return (
      <View className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-2.5 my-1.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity
              onPress={() => setIsActive(true)}
              activeOpacity={0.8}
              className="h-8 w-8 rounded-full items-center justify-center shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View className="ml-2.5 flex-1">
              <Text className="text-xs font-black text-foreground" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-[10px] text-muted font-semibold">
                Tap to listen voice recording
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsActive(true)}
            className="px-2.5 py-1 rounded-lg border border-[#BBF7D0] bg-white"
          >
            <Text className="text-[10px] font-black" style={{ color: accentColor }}>
              Listen
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] p-3 my-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className="h-8 w-8 rounded-xl items-center justify-center mr-2.5"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <MaterialIcons name="record-voice-over" size={18} color={accentColor} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-black text-[#14532D]" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-[10px] text-muted font-medium">
              Audio recording attached · Tap play to listen
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsActive(true)}
          activeOpacity={0.85}
          className="flex-row items-center px-3 py-1.5 rounded-xl shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          <MaterialIcons name="play-arrow" size={16} color="#FFFFFF" className="mr-0.5" />
          <Text className="text-xs font-black text-white ml-0.5">Listen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

