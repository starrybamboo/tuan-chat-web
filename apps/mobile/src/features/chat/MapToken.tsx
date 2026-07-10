import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

type MapTokenProps = {
  avatarUrl: string | null;
  hasStatus?: boolean;
  isSelected: boolean;
  onLongPress?: () => void;
  name: string;
  onPress: () => void;
  size: number;
  statusText?: string;
};

export const MapToken = memo(({
  avatarUrl,
  hasStatus = false,
  isSelected,
  name,
  onLongPress,
  onPress,
  size,
  statusText,
}: MapTokenProps) => {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityHint={statusText}
      accessibilityLabel={statusText ? `${name}，${statusText}` : name}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onLongPress={onLongPress}
      onPress={onPress}
    >
      <View
        style={[
          styles.container,
          {
            borderColor: isSelected ? theme.accent : theme.border,
            borderWidth: isSelected ? 2 : 1,
            height: size,
            width: size,
          },
        ]}
      >
        {avatarUrl
          ? (
              <CachedImage uri={avatarUrl} style={styles.avatar} />
            )
          : (
              <View style={[styles.fallback, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={{ fontSize: size * 0.4 }}>{name.charAt(0)}</ThemedText>
              </View>
            )}
        {hasStatus
          ? (
              <View
                pointerEvents="none"
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: theme.accent,
                    borderColor: theme.surface,
                  },
                ]}
              />
            )
          : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  avatar: { height: "100%", width: "100%" },
  container: {
    borderRadius: 999,
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statusDot: {
    borderRadius: 999,
    borderWidth: 1,
    bottom: 0,
    height: 7,
    position: "absolute",
    right: 0,
    width: 7,
  },
});
