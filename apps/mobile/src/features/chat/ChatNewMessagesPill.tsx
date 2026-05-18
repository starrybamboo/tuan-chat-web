import { ArrowDown } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const FAB_SIZE = 40;

const styles = StyleSheet.create({
  fab: {
    alignItems: "center",
    borderRadius: Radius.full,
    bottom: Spacing.xl,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.3)",
    elevation: 4,
    height: FAB_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: Spacing.xl,
    width: FAB_SIZE,
  },
  badge: {
    borderRadius: Radius.full,
    height: 10,
    position: "absolute",
    right: 2,
    top: 2,
    width: 10,
  },
});

interface ChatNewMessagesPillProps {
  count: number;
  onPress: () => void;
  visible: boolean;
}

export function ChatNewMessagesPill({ count, onPress, visible }: ChatNewMessagesPillProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
    transform: [
      { scale: withTiming(visible ? 1 : 0.8, { duration: 200 }) },
    ],
  }));

  return (
    <Animated.View style={[styles.fab, { backgroundColor: theme.backgroundElement }, animatedStyle]} pointerEvents={visible ? "auto" : "none"}>
      <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center", justifyContent: "center", width: "100%" }}>
        <ArrowDown size={18} color={theme.text} weight="bold" />
      </Pressable>
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.danger }]} />
      ) : null}
    </Animated.View>
  );
}
