import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: "70%", paddingBottom: 40 },
  handle: { alignSelf: "center", backgroundColor: "#555", borderRadius: 3, height: 4, marginTop: Spacing.md, width: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  content: { gap: Spacing.xl, paddingHorizontal: Spacing.xl },
  fieldRow: { gap: Spacing.sm },
  fieldLabel: { fontSize: 12 },
  fieldInput: { borderRadius: Radius.md, borderWidth: 1, fontSize: 15, minHeight: 40, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  typeRow: { flexDirection: "row", gap: Spacing.md },
  typeChip: { borderRadius: Radius.full, borderWidth: 1, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  buttonRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg },
  button: { alignItems: "center", borderRadius: Radius.md, flex: 1, minHeight: 44, justifyContent: "center" },
});

const TYPE_OPTIONS = [
  { label: "角色", value: 0 },
  { label: "骰娘", value: 1 },
];

interface RoleEditSheetProps {
  visible: boolean;
  role: UserRole | null;
  onClose: () => void;
  onSave: (data: { roleName: string; description: string; type: number }) => void;
  onDelete?: (roleId: number) => void;
  isSaving: boolean;
}

export function RoleEditSheet({ visible, role, onClose, onSave, onDelete, isSaving }: RoleEditSheetProps) {
  const theme = useTheme();
  const isEditing = role !== null;

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(0);

  const handleShow = () => {
    if (role) {
      setRoleName(role.roleName ?? "");
      setDescription(role.description ?? "");
      setType(role.type);
    } else {
      setRoleName("");
      setDescription("");
      setType(0);
    }
  };

  const handleSave = () => {
    if (!roleName.trim()) {
      Alert.alert("提示", "角色名不能为空");
      return;
    }
    onSave({ roleName: roleName.trim(), description: description.trim(), type });
  };

  const handleDelete = () => {
    if (!role || !onDelete) return;
    Alert.alert("删除角色", `确定要删除「${role.roleName}」吗？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => onDelete(role.roleId) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={handleShow}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <ThemedText type="heading">{isEditing ? "编辑角色" : "创建角色"}</ThemedText>
            <Pressable onPress={onClose}>
              <ThemedText themeColor="accent">关闭</ThemedText>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.fieldRow}>
              <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>角色名</ThemedText>
              <TextInput
                value={roleName}
                onChangeText={setRoleName}
                style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
                placeholderTextColor={theme.textSecondary}
                placeholder="输入角色名"
              />
            </View>
            <View style={styles.fieldRow}>
              <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>简介</ThemedText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.fieldInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background, minHeight: 60 }]}
                placeholderTextColor={theme.textSecondary}
                placeholder="角色简介（可选）"
                multiline
              />
            </View>
            {!isEditing ? (
              <View style={styles.fieldRow}>
                <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>类型</ThemedText>
                <View style={styles.typeRow}>
                  {TYPE_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.value}
                      onPress={() => setType(opt.value)}
                      style={[styles.typeChip, { borderColor: type === opt.value ? theme.accent : theme.border, backgroundColor: type === opt.value ? theme.accentMuted : "transparent" }]}
                    >
                      <ThemedText type="small" themeColor={type === opt.value ? "accent" : "textSecondary"}>{opt.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <View style={styles.buttonRow}>
              {isEditing && onDelete ? (
                <Pressable onPress={handleDelete} style={[styles.button, { backgroundColor: theme.dangerMuted }]}>
                  <ThemedText style={{ color: theme.danger, fontWeight: "600" }}>删除</ThemedText>
                </Pressable>
              ) : null}
              <Pressable onPress={handleSave} disabled={isSaving} style={[styles.button, { backgroundColor: theme.accent }]}>
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {isSaving ? "保存中…" : "保存"}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
