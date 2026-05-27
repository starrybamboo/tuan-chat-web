import { CaretLeft, MagnifyingGlass } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 48,
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    position: "relative",
    width: 36,
  },
  badge: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 16,
    justifyContent: "center",
    minWidth: 16,
    paddingHorizontal: 3,
    position: "absolute",
    right: -2,
    top: 2,
  },
  titleSection: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  hashText: {
    fontSize: 16,
  },
  searchButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});

type ChatHeaderProps = {
  onBackToRoutePage: () => void;
  onSearch: () => void;
  roomName: string | null;
  unreadCount?: number;
};

export function ChatHeader({ onBackToRoutePage, onSearch, roomName, unreadCount = 0 }: ChatHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable onPress={onBackToRoutePage} style={styles.backButton} accessibilityLabel="返回路由页">
        <CaretLeft size={22} color={theme.text} weight="bold" />
        {unreadCount > 0
          ? (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <ThemedText style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                  {unreadCount > 99 ? "99" : String(unreadCount)}
                </ThemedText>
              </View>
            )
          : null}
      </Pressable>

      <View style={styles.titleSection}>
        <ThemedText style={styles.hashText}>#</ThemedText>
        <ThemedText numberOfLines={1} type="heading" style={{ fontSize: 16, flex: 1 }}>
          {roomName ?? "未选择房间"}
        </ThemedText>
      </View>

      <Pressable style={styles.searchButton} onPress={onSearch} accessibilityLabel="搜索">
        <MagnifyingGlass size={20} color={theme.text} weight="bold" />
      </Pressable>
    </View>
  );
}
