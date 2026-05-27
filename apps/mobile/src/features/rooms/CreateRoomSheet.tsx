import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";

import type { MobileMessageAttachment } from "@/features/messages/mobileMessageAttachment";
import type { Room } from "@tuanchat/openapi-client/models/Room";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { MOBILE_MESSAGE_ATTACHMENT_KIND, pickMobileMessageAttachments } from "@/features/messages/mobileMessageAttachment";
import { uploadMobileMessageAttachments } from "@/features/messages/mobileMessageAttachmentUpload";
import { useTheme } from "@/hooks/use-theme";
import { mobileApiClient } from "@/lib/api";

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: Spacing.lg,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  avatarButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    marginBottom: Spacing.lg,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  button: {
    alignItems: "center",
    borderRadius: Radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

type CreateRoomSheetProps = {
  onClose: () => void;
  onCreated?: (room: Room) => void;
  spaceId: number;
  visible: boolean;
};

export function CreateRoomSheet({ onClose, onCreated, spaceId, visible }: CreateRoomSheetProps) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [avatarAttachment, setAvatarAttachment] = useState<MobileMessageAttachment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = async () => {
    setErrorMessage(null);
    try {
      const [picked] = await pickMobileMessageAttachments(MOBILE_MESSAGE_ATTACHMENT_KIND.IMAGE);
      if (picked) {
        setAvatarAttachment(picked);
      }
    }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "选择头像失败。");
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading)
      return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const uploaded = avatarAttachment
        ? await uploadMobileMessageAttachments(mobileApiClient, [avatarAttachment])
        : null;
      const avatarFileId = uploaded?.uploadedImages[0]?.fileId;
      const result = await mobileApiClient.spaceController.createRoom({
        spaceId,
        roomName: trimmed,
        ...(avatarFileId ? { avatarFileId } : {}),
      });
      const room = result.data;
      if (!result.success || !room?.roomId) {
        throw new Error(result.errMsg || "创建房间失败。");
      }
      setName("");
      setAvatarAttachment(null);
      onClose();
      onCreated?.(room);
    }
    catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "创建房间失败。");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      onClose={onClose}
      visible={visible}
    >
      <ThemedText style={styles.title}>创建房间</ThemedText>

      <TextInput
        autoFocus
        onChangeText={setName}
        placeholder="房间名称"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
        value={name}
      />

      <Pressable
        disabled={loading}
        onPress={() => void handlePickAvatar()}
        style={[styles.avatarButton, { borderColor: theme.border, backgroundColor: theme.background }]}
      >
        <ThemedText type="small" themeColor={avatarAttachment ? "text" : "textSecondary"}>
          {avatarAttachment ? `头像：${avatarAttachment.fileName}` : "选择房间头像（可选）"}
        </ThemedText>
      </Pressable>

      {errorMessage
        ? (
            <ThemedText style={{ color: theme.danger, fontSize: 12, marginBottom: Spacing.md }}>
              {errorMessage}
            </ThemedText>
          )
        : null}

      <Pressable
        disabled={!name.trim() || loading}
        onPress={handleCreate}
        style={[styles.button, { backgroundColor: name.trim() ? theme.accent : theme.backgroundElement, opacity: loading ? 0.6 : 1 }]}
      >
        {loading
          ? (
              <ActivityIndicator color="#fff" size="small" />
            )
          : (
              <ThemedText style={styles.buttonText}>创建</ThemedText>
            )}
      </Pressable>
    </BottomSheetModal>
  );
}
