import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { avatarThumbUrl } from "@/lib/media-url";

import type { RoomRolesById } from "./chat-avatar-utils";

import { resolveMessageAvatarFileId } from "./chat-avatar-utils";

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
  avatarUrl?: string | null;
  displayName?: string | null;
  preferUserAvatar?: boolean;
  roleId?: number | null;
  roomRolesById?: RoomRolesById;
  size?: number;
  userId?: number | null;
};

export const MessageAvatar = memo(({
  avatarFileId,
  avatarUrl,
  displayName,
  preferUserAvatar,
  roleId,
  roomRolesById,
  size = 40,
  userId,
}: MessageAvatarProps) => {
  const shouldUseUserIdentity = Boolean(preferUserAvatar);
  const resolvedAvatarFileId = shouldUseUserIdentity
    ? null
    : resolveMessageAvatarFileId(
        {
          avatarFileId: avatarFileId ?? undefined,
          roleId: roleId ?? undefined,
        },
        roomRolesById,
      );
  const hasProvidedAvatarUrl = avatarUrl !== undefined;
  const resolvedAvatarUrl = hasProvidedAvatarUrl
    ? avatarUrl
    : resolvedAvatarFileId
      ? avatarThumbUrl(resolvedAvatarFileId)
      : null;
  const borderRadius = size / 2;
  const fallbackAvatar = (
    <View style={{ alignItems: "center", backgroundColor: getAvatarColor(userId ?? undefined), borderRadius, height: size, justifyContent: "center", width: size }}>
      <ThemedText style={styles.avatarText}>{getAvatarInitial(displayName ?? "")}</ThemedText>
    </View>
  );

  if (resolvedAvatarUrl) {
    return (
      <View style={{ borderRadius, height: size, overflow: "hidden", width: size }}>
        <CachedImage
          uri={resolvedAvatarUrl}
          contentFit="cover"
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
        />
      </View>
    );
  }

  return fallbackAvatar;
});
