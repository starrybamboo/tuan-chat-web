import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { MobileButton } from "@/components/MobileButton";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: Spacing.lg,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: Spacing.lg },
});

type CreateRoomCategorySheetProps = {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  visible: boolean;
};

export function CreateRoomCategorySheet({ onClose, onCreate, visible }: CreateRoomCategorySheetProps) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || loading) {
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await onCreate(trimmedName);
      onClose();
    }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "新建分类失败。");
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetModal backgroundColor={theme.surface} handleColor={theme.border} onClose={onClose} visible={visible}>
      <ThemedText style={styles.title}>新建分类</ThemedText>
      <TextInput
        accessibilityLabel="分类名称"
        autoFocus
        onChangeText={setName}
        placeholder="分类名称"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
        value={name}
      />
      {errorMessage ? <ThemedText style={{ color: theme.danger, marginBottom: Spacing.md }}>{errorMessage}</ThemedText> : null}
      <MobileButton
        accessibilityLabel="创建分类"
        disabled={!name.trim() || loading}
        label="创建分类"
        loading={loading}
        onPress={handleCreate}
      />
    </BottomSheetModal>
  );
}
