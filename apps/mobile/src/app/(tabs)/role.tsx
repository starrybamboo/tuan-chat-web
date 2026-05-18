import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { RoleEditSheet } from "@/features/roles/RoleEditSheet";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useCreateRoleMutation, useDeleteRoleMutation, useUpdateRoleMutation } from "@/features/roles/useRoleMutations";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.xxl, paddingBottom: 120, paddingHorizontal: Spacing.xxl, paddingTop: Spacing.xxxl },
  hero: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  card: {
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxl,
  },
  roleItem: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  roleAvatar: {
    alignItems: "center",
    borderRadius: Radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  stateBlock: {
    alignItems: "center",
    paddingVertical: Spacing.xxl,
  },
  createButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
});

const AVATAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"];

function getRoleColor(roleId: number) {
  return AVATAR_COLORS[roleId % AVATAR_COLORS.length];
}

function RoleListItem({ role, theme, onPress }: { role: UserRole; theme: ReturnType<typeof useTheme>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.roleItem, { backgroundColor: theme.background }]}>
      {role.avatarFileId ? (
        <Image source={{ uri: avatarThumbUrl(role.avatarFileId) }} style={styles.roleAvatar} />
      ) : (
        <View style={[styles.roleAvatar, { backgroundColor: getRoleColor(role.roleId) }]}>
          <ThemedText style={styles.avatarText}>
            {(role.roleName ?? "").slice(0, 1) || "R"}
          </ThemedText>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold">{role.roleName ?? `角色 #${role.roleId}`}</ThemedText>
        {role.description ? (
          <ThemedText themeColor="textSecondary" type="caption" numberOfLines={1}>
            {role.description}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function RoleScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const myRolesQuery = useMyRolesQuery(userId);
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);

  const allRoles = myRolesQuery.data ?? [];
  const normalRoles = allRoles.filter(r => r.type === 0 && r.state !== 1);
  const diceRoles = allRoles.filter(r => r.type === 1 && r.state !== 1);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setEditSheetVisible(true);
  };

  const handleOpenEdit = (role: UserRole) => {
    setEditingRole(role);
    setEditSheetVisible(true);
  };

  const handleSave = async (data: { roleName: string; description: string; type: number }) => {
    try {
      if (editingRole) {
        await updateMutation.mutateAsync({
          roleId: editingRole.roleId,
          roleName: data.roleName,
          description: data.description,
        });
      } else {
        await createMutation.mutateAsync({
          roleName: data.roleName,
          description: data.description,
          type: data.type,
        });
      }
      setEditSheetVisible(false);
    } catch (e: any) {
      Alert.alert("操作失败", e?.message ?? "请稍后重试");
    }
  };

  const handleDelete = async (roleId: number) => {
    try {
      await deleteMutation.mutateAsync([roleId]);
      setEditSheetVisible(false);
    } catch (e: any) {
      Alert.alert("删除失败", e?.message ?? "请稍后重试");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View>
              <ThemedText type="title">角色</ThemedText>
              <ThemedText themeColor="textSecondary">我创建的所有角色</ThemedText>
            </View>
            <Pressable onPress={handleOpenCreate} style={[styles.createButton, { borderColor: theme.accent }]}>
              <ThemedText themeColor="accent" type="small">+ 创建</ThemedText>
            </Pressable>
          </View>

          {myRolesQuery.isPending ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="heading">角色 ({normalRoles.length})</ThemedText>
                {normalRoles.length === 0 ? (
                  <ThemedText themeColor="textSecondary" type="small">暂无角色</ThemedText>
                ) : (
                  normalRoles.map((role) => (
                    <RoleListItem key={role.roleId} role={role} theme={theme} onPress={() => handleOpenEdit(role)} />
                  ))
                )}
              </View>

              {diceRoles.length > 0 ? (
                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="heading">骰娘 ({diceRoles.length})</ThemedText>
                  {diceRoles.map((role) => (
                    <RoleListItem key={role.roleId} role={role} theme={theme} onPress={() => handleOpenEdit(role)} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <RoleEditSheet
        visible={editSheetVisible}
        role={editingRole}
        onClose={() => setEditSheetVisible(false)}
        onSave={(data) => void handleSave(data)}
        onDelete={(id) => void handleDelete(id)}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </ThemedView>
  );
}
