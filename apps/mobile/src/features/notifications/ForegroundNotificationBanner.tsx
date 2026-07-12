import { ChatCircleText, X } from "phosphor-react-native";
import { useEffect } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import Animated, { ReduceMotion, SlideInUp, SlideOutUp } from "react-native-reanimated";

import { Colors, Radius, Spacing } from "@/constants/theme";

export type ForegroundBanner = {
  id: string;
  title: string;
  body: string;
  targetPath: string | null;
};

const AUTO_DISMISS_MS = 4500;
const TOP_INSET = Platform.select({ ios: 52, android: (StatusBar.currentHeight ?? 24) + 6, default: 24 });

type ForegroundNotificationBannerProps = {
  banner: ForegroundBanner | null;
  onDismiss: () => void;
  onPress: (banner: ForegroundBanner) => void;
};

/**
 * 前台来消息时由 App 自绘的悬浮提醒条。
 * 安卓系统在 App 处于前台时默认不会把通知弹成 heads-up 悬浮窗，
 * 所以前台场景用这个组件补齐"顶部滑入 + 自动消失 + 点击跳转"的悬浮提醒。
 */
export function ForegroundNotificationBanner({ banner, onDismiss, onPress }: ForegroundNotificationBannerProps) {
  if (!banner) {
    return null;
  }

  return (
    <BannerCard
      key={banner.id}
      banner={banner}
      onDismiss={onDismiss}
      onPress={onPress}
    />
  );
}

function BannerCard({ banner, onDismiss, onPress }: { banner: ForegroundBanner; onDismiss: () => void; onPress: (banner: ForegroundBanner) => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [banner.id, onDismiss]);

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <Animated.View
        entering={SlideInUp.duration(280).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutUp.duration(220).reduceMotion(ReduceMotion.System)}
        style={styles.card}
      >
        <Pressable
          accessibilityLabel={`打开通知：${banner.title}${banner.body ? `，${banner.body}` : ""}`}
          accessibilityHint="点按查看相关对话"
          accessibilityRole="button"
          android_ripple={{ color: Colors.dark.accentMuted }}
          style={styles.pressable}
          onPress={() => onPress(banner)}
        >
          <View style={styles.iconWrap}>
            <ChatCircleText color={Colors.dark.accent} size={22} weight="fill" />
          </View>
          <View style={styles.content}>
            <Text numberOfLines={1} style={styles.title}>
              {banner.title}
            </Text>
            <Text numberOfLines={2} style={styles.body}>
              {banner.body}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="关闭提醒"
            accessibilityRole="button"
            hitSlop={10}
            style={styles.close}
            onPress={onDismiss}
          >
            <X color={Colors.dark.textSecondary} size={16} weight="bold" />
          </Pressable>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    left: 0,
    paddingHorizontal: Spacing.lg,
    position: "absolute",
    right: 0,
    top: TOP_INSET,
    zIndex: 1000,
  },
  card: {
    backgroundColor: Colors.dark.surfaceOverlay,
    borderColor: Colors.dark.border,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 8,
    shadowColor: Colors.dark.shadow,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  pressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: Colors.dark.accentMuted,
    borderRadius: Radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  close: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24,
  },
});
