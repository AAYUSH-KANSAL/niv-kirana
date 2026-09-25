import { FlatList, Text, TouchableOpacity, View } from "react-native";

interface CategoryNavProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryNavProps) {
  return (
    <View className="mb-3.5">
      <FlatList
        data={categories}
        horizontal
        keyExtractor={(item, index) => `cat-nav-${item}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 2 }}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item;
          return (
            <TouchableOpacity
              onPress={() => onSelectCategory(item)}
              activeOpacity={0.8}
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isSelected ? "#176B45" : "#FFFFFF",
                borderWidth: 1,
                borderColor: isSelected ? "#176B45" : "#E2E8D8",
                elevation: isSelected ? 2 : 0,
              }}
            >
              {isSelected ? (
                <View
                  style={{
                    height: 6,
                    width: 6,
                    borderRadius: 3,
                    backgroundColor: "#FFFFFF",
                    marginRight: 6,
                  }}
                />
              ) : null}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isSelected ? "900" : "700",
                  color: isSelected ? "#FFFFFF" : "#3B4740",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
