import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

export interface ScreenContainerProps extends ViewProps {
  /**
   * SafeArea edges to apply. Defaults to ["top", "left", "right"].
   * Bottom is typically handled by Tab Bar.
   */
  edges?: Edge[];
  /**
   * Tailwind className for the content area.
   */
  className?: string;
  /**
   * Additional className for the outer container (background layer).
   */
  containerClassName?: string;
  /**
   * Additional className for the SafeAreaView (content layer).
   */
  safeAreaClassName?: string;
}

/**
 * A container component that properly handles SafeArea and background colors.
 */
export function ScreenContainer({
  children,
  edges = ["top", "left", "right"],
  className,
  containerClassName,
  safeAreaClassName,
  style,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  const safePadding = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: edges.includes("left") ? insets.left : 0,
    paddingRight: edges.includes("right") ? insets.right : 0,
  };

  return (
    <View
      className={cn("flex-1 bg-white", containerClassName)}
      style={[styles.container, safePadding, style]}
      {...props}
    >
      <View className={cn("flex-1", className, safeAreaClassName)}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
