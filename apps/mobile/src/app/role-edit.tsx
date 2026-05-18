import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useCreateRoleMutation, useDeleteRoleMutation, useUpdateRoleMutation } from "@/features/roles/useRoleMutations";
import { AvatarGrid } from "@/features/roles/edit/AvatarGrid";
import { RuleSection } from "@/features/roles/edit/RuleSection";
import { AbilitySection } from "@/features/roles/edit/AbilitySection";
import { useTheme } from "@/hooks/use-theme";

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  content: {
    gap: Spacing.xxl,
    paddingBottom: 120,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  section: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  input: {
    borderRadius: Radius.md,
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  typeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  typeChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  deleteButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
  },
});

export default function RoleEditScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const params = useLocalSearchParams<{ roleId?: string }>();
  const roleId = params.roleId ? Number(params.roleId) : null;
  const isCreating = roleId === null;

  const myRolesQuery = useMyRolesQuery(userId);
  const existingRole = (myRolesQuery.data ?? []).find(r => r.roleId === roleId) ?? null;

  const [roleName, setRoleName] = useState(existingRole?.roleName ?? "");
  const [description, setDescription] = useState(existingRole?.description ?? "");
  const [roleType, setRoleType] = useState<number>(existingRole?.type ?? 0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(existingRole?.avatarId ?? null);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);

  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const handleSave = useCallback(async () => {
    if (!roleName.trim()) {
      Alert.alert("提示", "角色名称不能为空");
      return;
    }
    try {
      if (isCreating) {
        await createMutation.mutateAsync({
          roleName: roleName.trim(),
          description: description.trim(),
          type: roleType,
        });
      } else {
        await updateMutation.mutateAsync({
          roleId: roleId!,
          roleName: roleName.trim(),
          description: description.trim(),
          ...(selectedAvatarId != null && { avatarId: selectedAvatarId }),
        });
      }
      router.back();
    } catch (e: any) {
      Alert.alert("保存失败", e?.message ?? "请稍后重试");
    }
  }, [roleName, description, roleType, roleId, isCreating, selectedAvatarId, createMutation, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!roleId) return;
    Alert.alert("确认删除", "删除后无法恢复，确定要删除吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync([roleId]);
            router.back();
          } catch (e: any) {
            Alert.alert("删除失败", e?.message ?? "请稍后重试");
          }
        },
      },
    ]);
  }, [roleId, deleteMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText themeColor="accent">取消</ThemedText>
          </Pressable>
          <ThemedText type="heading">{isCreating ? "创建角色" : "编辑角色"}</ThemedText>
          <Pressable onPress={handleSave} disabled={isSaving}>
            <ThemedText themeColor="accent">{isSaving ? "保存中..." : "保存"}</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Basic Info */}
          <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="heading">基本信息</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="角色名称（必填）"
              placeholderTextColor={theme.textSecondary}
              value={roleName}
              onChangeText={setRoleName}
              maxLength={50}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, minHeight: 80 }]}
              placeholder="角色描述（选填）"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={140}
            />
            {isCreating && (
              <View>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.sm }}>
                  角色类型
                </ThemedText>
                <View style={styles.typeRow}>
                  <Pressable
                    onPress={() => setRoleType(0)}
                    style={[styles.typeChip, { borderColor: roleType === 0 ? theme.accent : theme.border }]}
                  >
                    <ThemedText themeColor={roleType === 0 ? "accent" : "textSecondary"} type="small">
                      角色
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setRoleType(1)}
                    style={[styles.typeChip, { borderColor: roleType === 1 ? theme.accent : theme.border }]}
                  >
                    <ThemedText themeColor={roleType === 1 ? "accent" : "textSecondary"} type="small">
                      骰娘
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Avatar Grid - only show for existing roles */}
          {!isCreating && roleId && (
            <AvatarGrid
              roleId={roleId}
              currentAvatarId={selectedAvatarId}
              onAvatarSelect={setSelectedAvatarId}
            />
          )}

          {/* Rule Selection */}
          {!isCreating && roleId && (
            <RuleSection
              roleId={roleId}
              selectedRuleId={selectedRuleId}
              onRuleChange={setSelectedRuleId}
            />
          )}

          {/* Ability Editor */}
          {!isCreating && roleId && selectedRuleId && (
            <AbilitySection roleId={roleId} ruleId={selectedRuleId} />
          )}

          {/* Delete */}
          {!isCreating && (
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteButton, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText style={{ color: "#ef4444" }}>删除角色</ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
