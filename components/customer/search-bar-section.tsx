import { MaterialIcons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarSectionProps {
  query: string;
  onQueryChange: (text: string) => void;
  aiSearchStatus: "idle" | "loading" | "ready";
  aiSearchCount?: number;
}

export function SearchBarSection({
  query,
  onQueryChange,
  aiSearchStatus,
  aiSearchCount = 0,
}: SearchBarSectionProps) {
  const hasQuery = query.trim().length > 0;

  return (
    <View className="mb-3.5">
      {/* Search Input Container */}
      <View className="flex-row items-center rounded-2xl bg-white border border-[#E2E8D8] px-3.5 py-1">
        <MaterialIcons name="search" size={22} color="#176B45" />

        <TextInput
          accessibilityLabel="Products search करें"
          accessibilityHint="AI local names, Hindi/Hinglish words aur spelling mistakes se product khojega"
          value={query}
          onChangeText={onQueryChange}
          placeholder="Search atta, dal, ghee, doodh, snacks in Kuchesar..."
          placeholderTextColor="#9E9E9E"
          returnKeyType="search"
          className="flex-1 px-3 py-2.5 text-sm text-[#14221B] font-semibold"
        />

        {hasQuery ? (
          <TouchableOpacity
            accessibilityLabel="Search clear करें"
            onPress={() => onQueryChange("")}
            className="p-1 mr-1"
          >
            <MaterialIcons name="cancel" size={18} color="#9E9E9E" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* AI Semantic Search Status Feedback */}
      {hasQuery && aiSearchStatus === "loading" ? (
        <View className="flex-row items-center mt-2 px-1">
          <MaterialIcons name="auto-awesome" size={14} color="#176B45" />
          <Text className="text-[11px] font-bold text-[#176B45] ml-1.5">
            Searching Kuchesar Road Chopla catalog…
          </Text>
        </View>
      ) : null}

      {hasQuery && aiSearchStatus === "ready" && aiSearchCount > 0 ? (
        <View className="flex-row items-center mt-2 px-1">
          <MaterialIcons name="auto-awesome" size={14} color="#176B45" />
          <Text className="text-[11px] font-bold text-[#176B45] ml-1.5">
            AI ne {aiSearchCount} related products khoje
          </Text>
        </View>
      ) : null}
    </View>
  );
}
