import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Platform, Pressable, StyleSheet, View } from "react-native";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { RoleAvatar } from "@tuanchat/openapi-client/models/RoleAvatar";

import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { AvatarCropModal } from "@/features/roles/edit/AvatarCropModal";
import { useCreateAvatarMutation, useDeleteAvatarMutation, useUpdateAvatarMutation } from "@/features/roles/useAvatarMutations";
import { useRoleAvatarsQuery } from "@/features/roles/useRoleAvatarsQuery";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";
import { avatarThumbUrl } from "@/lib/media-url";

const GRID_COLUMNS = 4;
const GRID_ITEM_SIZE = 72;

type AvatarCropSource = MobileMessageAttachment & {
  height: number;
  width: number;
};

type AvatarGridItem
  = { type: "avatar"; avatar: RoleAvatar; key: string }
    | { type: "add"; key: string };

function createAvatarCropFileName(fileName: string): string {
  const timestamp = Date.now();
  const baseName = fileName.replace(/\.[^.]+$/, "") || "avatar";
  return `${baseName}_avatar_${timestamp}.jpg`;
}

function getCreatedAvatarId(createResult: unknown): number {
  if (typeof createResult === "number" && createResult > 0) {
    return createResult;
  }

  const apiResult = createResult as { data?: unknown; errMsg?: string; success?: boolean } | null;
  if (apiResult?.success === false) {
    throw new Error(apiResult.errMsg || "创建头像失败。");
  }
  if (typeof apiResult?.data === "number" && apiResult.data > 0) {
    return apiResult.data;
  }

  throw new Error("创建头像失败：未返回头像 ID。");
}

function assertMutationSuccess(result: unknown, fallbackMessage: string): void {
  const apiResult = result as { errMsg?: string; success?: boolean } | null;
  if (apiResult?.success === false) {
    throw new Error(apiResult.errMsg || fallbackMessage);
  }
}

const styles = StyleSheet.create({
  section: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridList: {},
  gridContent: { gap: Spacing.md },
  gridRow: { gap: Spacing.md },
  avatarItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: 2,
    height: GRID_ITEM_SIZE,
    justifyContent: "center",
    overflow: "hidden",
    width: GRID_ITEM_SIZE,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  deleteBadge: {
    alignItems: "center",
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -6,
    top: -6,
    width: 20,
    zIndex: 1,
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

type AvatarGridProps = {
  roleId: number;
  currentAvatarId?: number | null;
  onAvatarSelect?: (avatarId: number) => void;
};

export function AvatarGrid({ roleId, currentAvatarId, onAvatarSelect }: AvatarGridProps) {
  const theme = useTheme();
  const avatarsQuery = useRoleAvatarsQuery(roleId);
  const createAvatarMutation = useCreateAvatarMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const deleteAvatarMutation = useDeleteAvatarMutation();
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cropSource, setCropSource] = useState<AvatarCropSource | null>(null);
  const [gridWidth, setGridWidth] = useState(0);

  const avatars = useMemo(() => avatarsQuery.data ?? [], [avatarsQuery.data]);
  const gridGap = Spacing.md;
  const avatarSize = gridWidth > 0
    ? Math.floor((gridWidth - gridGap * (GRID_COLUMNS - 1)) / GRID_COLUMNS)
    : GRID_ITEM_SIZE;
  const avatarGridItems = useMemo<AvatarGridItem[]>(() => [
    ...avatars.map(avatar => ({
      type: "avatar" as const,
      avatar,
      key: `avatar:${avatar.avatarId ?? avatar.avatarFileId ?? "unknown"}`,
    })),
    ...(editing ? [{ type: "add" as const, key: "avatar:add" }] : []),
  ], [avatars, editing]);

  const handlePickImage = useCallback(async () => {
    if (uploading || cropSource) {
      return;
    }

    try {
      const attachments = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (attachments.length === 0)
        return;

      const attachment = attachments[0];
      setCropSource({
        ...attachment,
        uri: attachment.uri,
        width: Math.max(1, attachment.width ?? 512),
        height: Math.max(1, attachment.height ?? 512),
      });
    }
    catch (e: any) {
      Alert.alert("选择失败", e?.message ?? "请稍后重试");
    }
  }, [cropSource, uploading]);

  const handleCropConfirm = useCallback(async (croppedUri: string) => {
    if (!cropSource) {
      throw new Error("未选择原图，请重新选择图片。");
    }

    setUploading(true);
    let createdAvatarId: number | null = null;
    try {
      const croppedAttachment: MobileMessageAttachment = {
        id: `${cropSource.id}::avatar-crop::${Date.now()}`,
        uri: croppedUri,
        fileName: createAvatarCropFileName(cropSource.fileName),
        mimeType: "image/jpeg",
        kind: MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE,
        width: 256,
        height: 256,
      };

      const uploaded = await uploadMobileMessageAttachments(mobileApiClient, [cropSource, croppedAttachment]);
      const originFileId = uploaded.uploadedImages[0]?.fileId;
      const avatarFileId = uploaded.uploadedImages[1]?.fileId;

      if (!originFileId || !avatarFileId) {
        throw new Error("头像媒体上传失败：未返回完整 fileId。");
      }

      const createResult = await createAvatarMutation.mutateAsync({ roleId } as any);
      const newAvatarId = getCreatedAvatarId(createResult);
      createdAvatarId = newAvatarId;
      const updateResult = await updateAvatarMutation.mutateAsync({
        avatarId: newAvatarId,
        roleId,
        avatarFileId,
        originFileId,
        spriteFileId: originFileId,
      });
      assertMutationSuccess(updateResult, "更新头像失败。");

      onAvatarSelect?.(newAvatarId);
      setCropSource(null);
    }
    catch (error) {
      if (createdAvatarId != null) {
        try {
          await deleteAvatarMutation.mutateAsync({ avatarId: createdAvatarId, roleId });
        }
        catch {
          // Best-effort cleanup: keep the upload modal open so the user can retry or cancel.
        }
      }
      throw error instanceof Error ? error : new Error("头像上传失败，请稍后重试。");
    }
    finally {
      setUploading(false);
    }
  }, [cropSource, roleId, createAvatarMutation, updateAvatarMutation, deleteAvatarMutation, onAvatarSelect]);

  const handleCropCancel = useCallback(() => {
    setCropSource(null);
  }, []);

  const handleDelete = useCallback((avatar: RoleAvatar) => {
    if (!avatar.avatarId)
      return;
    const doDelete = () => deleteAvatarMutation.mutate({ avatarId: avatar.avatarId!, roleId });
    if (Platform.OS === "web") {
      if (window.confirm("确定要删除这个头像吗？"))
        doDelete();
    }
    else {
      Alert.alert("删除头像", "确定要删除这个头像吗？", [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: doDelete },
      ]);
    }
  }, [deleteAvatarMutation, roleId]);

  const toggleEditing = useCallback(() => setEditing(prev => !prev), []);

  const renderAvatarItem = useCallback(({ item }: { item: AvatarGridItem }) => {
    if (item.type === "add") {
      return (
        <Pressable
          onPress={handlePickImage}
          disabled={uploading || !!cropSource}
          style={[styles.addButton, { borderColor: theme.accent, height: avatarSize, width: avatarSize }]}
        >
          <ThemedText themeColor="accent" type="small">
            {uploading ? "..." : "+"}
          </ThemedText>
        </Pressable>
      );
    }

    const avatar = item.avatar;
    const isCurrent = avatar.avatarId === currentAvatarId;
    return (
      <View style={styles.avatarWrapper}>
        {editing
          ? (
              <Pressable
                onPress={() => handleDelete(avatar)}
                style={[styles.deleteBadge, { backgroundColor: "#ef4444" }]}
              >
                <ThemedText style={{ color: "#fff", fontSize: 12, lineHeight: 14 }}>x</ThemedText>
              </Pressable>
            )
          : null}
        <Pressable
          onPress={() => {
            if (!editing && avatar.avatarId) {
              onAvatarSelect?.(avatar.avatarId);
            }
          }}
          style={[styles.avatarItem, { borderColor: isCurrent ? theme.accent : theme.border, height: avatarSize, width: avatarSize }]}
        >
          {avatar.avatarFileId
            ? (
                <CachedImage
                  uri={avatarThumbUrl(avatar.avatarFileId)}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              )
            : (
                <ThemedText themeColor="textSecondary" type="small">?</ThemedText>
              )}
        </Pressable>
      </View>
    );
  }, [avatarSize, cropSource, currentAvatarId, editing, handleDelete, handlePickImage, onAvatarSelect, theme.accent, theme.border, uploading]);

  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.sectionHeader}>
        <ThemedText type="heading">头像</ThemedText>
        <Pressable onPress={toggleEditing}>
          <ThemedText themeColor="accent" type="small">
            {editing ? "完成" : "编辑"}
          </ThemedText>
        </Pressable>
      </View>

      {avatars.length === 0 && !uploading
        ? (
            <View style={styles.emptyState}>
              <ThemedText themeColor="textSecondary" type="small">暂无头像，点击添加</ThemedText>
            </View>
          )
        : null}

      <FlatList
        data={avatarGridItems}
        key={`avatar-grid-${GRID_COLUMNS}`}
        keyExtractor={item => item.key}
        renderItem={renderAvatarItem}
        numColumns={GRID_COLUMNS}
        scrollEnabled={avatars.length > GRID_COLUMNS * 3}
        nestedScrollEnabled
        removeClippedSubviews={false}
        style={styles.gridList}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        onLayout={event => setGridWidth(event.nativeEvent.layout.width)}
      />

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
