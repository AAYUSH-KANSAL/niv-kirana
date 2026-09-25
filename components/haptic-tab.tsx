import * as Haptics from "expo-haptics";
import { Platform, Pressable, type PressableProps } from "react-native";

export function HapticTab(props: PressableProps) {
  return (
    <Pressable
      {...props}
      onPressIn={(ev) => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}

