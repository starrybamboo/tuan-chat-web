import type { StyleProp, ViewStyle } from "react-native";

import { StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius } from "@/constants/theme";

import {
  CONTACT_LIST_AVATAR_POINTER_EVENTS,
  getContactAvatarColor,
  getContactAvatarInitial,
} from "./contactListAvatarModel";

type ContactListAvatarProps = {
  colorSeed: number | null | undefined;
  displayName: string | null | undefined;
  labelFontSize?: number;
  size: number;
  style?: StyleProp<ViewStyle>;
  uri: string | null | undefined;
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  fallback: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
});

/** Renders a non-interactive avatar inside a pressable contact row. */
export function ContactListAvatar({
  colorSeed,
  displayName,
  labelFontSize,
  size,
  style,
  uri,
}: ContactListAvatarProps) {
  const radius = Math.min(size / 2, Radius.full);

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents={CONTACT_LIST_AVATAR_POINTER_EVENTS}
      style={[styles.container, { borderRadius: radius, height: size, width: size }, style]}
    >
      <View style={[styles.fallback, { backgroundColor: getContactAvatarColor(colorSeed) }]}>
        <ThemedText style={{ color: "#fff", fontSize: labelFontSize ?? Math.max(12, Math.round(size * 0.35)), fontWeight: "700" }}>
          {getContactAvatarInitial(displayName)}
        </ThemedText>
      </View>
      {uri ? <CachedImage uri={uri} style={styles.image} contentFit="cover" /> : null}
    </View>
  );
}
