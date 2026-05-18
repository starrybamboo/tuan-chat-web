import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useRoleAvatarsQuery } from "@/features/roles/useRoleAvatarsQuery";
import { useCreateAvatarMutation, useDeleteAvatarMutation, useUpdateAvatarMutation } from "@/features/roles/useAvatarMutations";
import { AvatarCropModal } from "@/features/roles/edit/AvatarCropModal";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

const GRID_ITEM_SIZE = 72;

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  avatarItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    height: GRID_ITEM_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: GRID_ITEM_SIZE,
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  addButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    height: GRID_ITEM_SIZE,
    justifyContent: "center",
    width: GRID_ITEM_SIZE,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
});

interface AvatarGridProps {
  roleId: number;
  currentAvatarId?: number | null;
  onAvatarSelect?: (avatarId: number) => void;
}

export function AvatarGrid({ roleId, currentAvatarId, onAvatarSelect }: AvatarGridProps) {
  const theme = useTheme();
  const avatarsQuery = useRoleAvatarsQuery(roleId);
  const createAvatarMutation = useCreateAvatarMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const deleteAvatarMutation = useDeleteAvatarMutation();
  const [uploading, setUploading] = useState(false);
  const [cropSource, setCropSource] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);

  const avatars = avatarsQuery.data ?? [];

  const handlePickImage = useCallback(async () => {
    try {
      const attachments = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (attachments.length === 0) return;

      const attachment = attachments[0];
      setCropSource({
        uri: attachment.uri,
        width: attachment.width ?? 512,
        height: attachment.height ?? 512,
      });
    } catch (e: any) {
      Alert.alert("选择失败", e?.message ?? "请稍后重试");
    }
  }, []);

  const handleCropConfirm = useCallback(async (croppedUri: string) => {
    setCropSource(null);
    setUploading(true);
    try {
      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [{
        id: `avatar_crop_${Date.now()}`,
        uri: croppedUri,
        fileName: `avatar_${Date.now()}.jpg`,
        mimeType: "image/jpeg",
        kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
        width: 256,
        height: 256,
      }]);
      const avatarFileId = uploaded.uploadedImages[0]?.fileId;

      if (avatarFileId) {
        const createResult = await createAvatarMutation.mutateAsync({ roleId } as any);
        const newAvatarId = (createResult as any)?.data ?? createResult;
        await updateAvatarMutation.mutateAsync({
          avatarId: newAvatarId as number,
          roleId,
          avatarFileId,
        });
      }
    } catch (e: any) {
      Alert.alert("上传失败", e?.message ?? "请稍后重试");
    } finally {
      setUploading(false);
    }
  }, [roleId, createAvatarMutation, updateAvatarMutation]);

  const handleCropCancel = useCallback(() => {
    setCropSource(null);
  }, []);

  const handleDelete = useCallback((avatar: RoleAvatar) => {
    if (!avatar.avatarId) return;
    Alert.alert("删除头像", "确定要删除这个头像吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          deleteAvatarMutation.mutate({ avatarId: avatar.avatarId!, roleId });
        },
      },
    ]);
  }, [deleteAvatarMutation, roleId]);

  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="heading">头像</ThemedText>

      {avatars.length === 0 && !uploading ? (
        <View style={styles.emptyState}>
          <ThemedText themeColor="textSecondary" type="small">暂无头像，点击添加</ThemedText>
        </View>
      ) : null}

      <View style={styles.grid}>
        {avatars.map((avatar) => {
          const isCurrent = avatar.avatarId === currentAvatarId;
          return (
            <Pressable
              key={avatar.avatarId}
              onPress={() => avatar.avatarId && onAvatarSelect?.(avatar.avatarId)}
              onLongPress={() => handleDelete(avatar)}
              style={[styles.avatarItem, { borderColor: isCurrent ? theme.accent : theme.border }]}
            >
              {avatar.avatarFileId ? (
                <Image
                  source={{ uri: avatarThumbUrl(avatar.avatarFileId) }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <ThemedText themeColor="textSecondary" type="small">?</ThemedText>
              )}
            </Pressable>
          );
        })}

        <Pressable
          onPress={handlePickImage}
          disabled={uploading}
          style={[styles.addButton, { borderColor: theme.accent }]}
        >
          <ThemedText themeColor="accent" type="small">
            {uploading ? "..." : "+"}
          </ThemedText>
        </Pressable>
      </View>

      <AvatarCropModal
        visible={!!cropSource}
        imageUri={cropSource?.uri ?? ""}
        imageWidth={cropSource?.width ?? 512}
        imageHeight={cropSource?.height ?? 512}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </View>
  );
}
