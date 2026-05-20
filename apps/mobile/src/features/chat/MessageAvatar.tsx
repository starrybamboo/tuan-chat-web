import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";

import type { RoomRolesById } from "./chat-avatar-utils";

import { resolveMessageAvatarUrl } from "./chat-avatar-utils";

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

const styles = StyleSheet.create({
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

function getAvatarColor(userId: number | undefined) {
  if (!userId) {
    return AVATAR_COLORS[0];
  }
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getAvatarInitial(displayName: string) {
  return displayName ? displayName.slice(0, 1) : "?";
}

type MessageAvatarProps = {
  avatarFileId?: number | null;
  displayName?: string | null;
  roleId?: number | null;
  roomRolesById?: RoomRolesById;
  size?: number;
  userId?: number | null;
};

export const MessageAvatar = memo(({
  avatarFileId,
  displayName,
  roleId,
  roomRolesById,
  size = 40,
  userId,
}: MessageAvatarProps) => {
  const avatarUrl = resolveMessageAvatarUrl(
    {
      avatarFileId: avatarFileId ?? undefined,
      roleId: roleId ?? undefined,
    },
    roomRolesById,
  );
  const borderRadius = size / 2;

  if (avatarUrl) {
    return (
      <CachedImage
        uri={avatarUrl}
        contentFit="cover"
        style={{ borderRadius, height: size, width: size }}
      />
    );
  }

  return (
    <View style={{ alignItems: "center", backgroundColor: getAvatarColor(userId ?? undefined), borderRadius, height: size, justifyContent: "center", width: size }}>
      <ThemedText style={styles.avatarText}>{getAvatarInitial(displayName ?? "")}</ThemedText>
    </View>
  );
});
