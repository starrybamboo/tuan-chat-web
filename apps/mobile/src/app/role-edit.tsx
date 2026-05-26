import { router, useLocalSearchParams } from "expo-router";
import { CaretLeft, FloppyDisk, Trash } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { CachedImage } from "@/components/CachedImage";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useAuthSession } from "@/features/auth/auth-session";
import { AbilitySection } from "@/features/roles/edit/AbilitySection";
import { AvatarGrid } from "@/features/roles/edit/AvatarGrid";
import { resolveRoleEditRouteState } from "@/features/roles/edit/roleEditRouteParams";
import { RuleSection } from "@/features/roles/edit/RuleSection";
import { useMyRolesQuery } from "@/features/roles/useMyRolesQuery";
import { useRoleAvatarsQuery } from "@/features/roles/useRoleAvatarsQuery";
import { useCreateRoleMutation, useDeleteRoleMutation, useUpdateRoleMutation } from "@/features/roles/useRoleMutations";
import { useTheme } from "@/hooks/use-theme";
import { avatarThumbUrl } from "@/lib/media-url";
import { readMobileKeyValue, writeMobileKeyValue } from "@/lib/mobile-key-value-storage";

const DESCRIPTION_INPUT_MIN_HEIGHT = 38;
const DEFAULT_ROLE_EDIT_RULE_ID = 1;
const ROLE_LIST_ROUTE = "/(tabs)/role";
const ROLE_EDIT_RULE_STORAGE_SCOPE = "role-edit-rule";

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 52,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: {
    maxWidth: "42%",
  },
  headerBackButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    left: Spacing.lg,
    position: "absolute",
    width: 36,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    position: "absolute",
    right: Spacing.lg,
  },
  headerActionButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.sm,
    height: 34,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: Spacing.sm,
  },
  headerActionText: {
    fontSize: 14,
    fontWeight: "700",
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
  basicInfoSection: {
    gap: Spacing.md,
  },
  basicInfoAfterAvatar: {
    marginTop: -Spacing.xl,
  },
  basicInfoDivider: {
    alignSelf: "stretch",
    height: StyleSheet.hairlineWidth,
  },
  input: {
    borderRadius: Radius.md,
    boxShadow: "none",
    fontSize: 15,
    outlineColor: "transparent",
    outlineStyle: "solid",
    outlineWidth: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  roleNameInput: {
    alignSelf: "center",
    fontSize: 22,
    fontWeight: "700",
    minHeight: 44,
    textAlign: "center",
    width: "44%",
  },
  roleDescriptionInput: {
    alignSelf: "stretch",
    minHeight: DESCRIPTION_INPUT_MIN_HEIGHT,
    textAlign: "left",
    width: "100%",
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
  profileHeader: {
    alignItems: "center",
    gap: Spacing.md,
  },
  roleAvatar: {
    borderRadius: Radius.full,
    height: 96,
    width: 96,
  },
  roleAvatarButton: {
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  roleAvatarFallback: {
    alignItems: "center",
    backgroundColor: "#6366f1",
    borderRadius: Radius.full,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  invalidState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.lg,
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  invalidBackButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
});

export default function RoleEditScreen() {
  const theme = useTheme();
  const { session } = useAuthSession();
  const userId = session?.userId ?? null;
  const params = useLocalSearchParams<{ roleId?: string | string[] }>();
  const routeState = useMemo(() => resolveRoleEditRouteState(params.roleId), [params.roleId]);
  const roleId = routeState.kind === "edit" ? routeState.roleId : null;
  const isCreating = routeState.kind === "create";
  const hasValidRoleId = routeState.kind === "edit";
  const isInvalidRoleRoute = routeState.kind === "invalid";

  const myRolesQuery = useMyRolesQuery(userId);
  const existingRole = hasValidRoleId
    ? (myRolesQuery.data ?? []).find(r => r.roleId === roleId) ?? null
    : null;

  const [roleName, setRoleName] = useState(existingRole?.roleName ?? "");
  const [description, setDescription] = useState(existingRole?.description ?? "");
  const [roleType, setRoleType] = useState<number>(existingRole?.type ?? 0);
  const [selectedAvatarId, setSelectedAvatarId] = useState<number | null>(existingRole?.avatarId ?? null);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(DEFAULT_ROLE_EDIT_RULE_ID);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [descriptionInputHeight, setDescriptionInputHeight] = useState(DESCRIPTION_INPUT_MIN_HEIGHT);
  const hydratedRoleIdRef = useRef<number | "create" | null>(null);

  const avatarsQuery = useRoleAvatarsQuery(roleId);
  const validSelectedRuleId = typeof selectedRuleId === "number" && selectedRuleId > 0
    ? selectedRuleId
    : null;
  const displayAvatarFileId = useMemo(() => {
    if (!selectedAvatarId)
      return existingRole?.avatarFileId ?? null;
    const found = (avatarsQuery.data ?? []).find(a => a.avatarId === selectedAvatarId);
    return found?.avatarFileId ?? existingRole?.avatarFileId ?? null;
  }, [selectedAvatarId, avatarsQuery.data, existingRole?.avatarFileId]);
  const avatarThumbSrc = avatarThumbUrl(displayAvatarFileId);

  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const closeRoleEdit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(ROLE_LIST_ROUTE as any);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- Query data hydrates the editable form once per role/create route. */
  useEffect(() => {
    if (isInvalidRoleRoute) {
      hydratedRoleIdRef.current = null;
      return;
    }

    if (isCreating) {
      if (hydratedRoleIdRef.current === "create") {
        return;
      }
      hydratedRoleIdRef.current = "create";
      setRoleName("");
      setDescription("");
      setRoleType(0);
      setSelectedAvatarId(null);
      setSelectedRuleId(DEFAULT_ROLE_EDIT_RULE_ID);
      return;
    }

    if (!existingRole || hydratedRoleIdRef.current === roleId) {
      return;
    }

    hydratedRoleIdRef.current = roleId;
    setRoleName(existingRole.roleName ?? "");
    setDescription(existingRole.description ?? "");
    setRoleType(existingRole.type ?? 0);
    setSelectedAvatarId(existingRole.avatarId ?? null);
    setSelectedRuleId(DEFAULT_ROLE_EDIT_RULE_ID);
  }, [existingRole, isCreating, isInvalidRoleRoute, roleId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (roleId === null) {
      return;
    }

    let cancelled = false;
    void readMobileKeyValue<number>(`role:${roleId}`, {
      scope: ROLE_EDIT_RULE_STORAGE_SCOPE,
      userId,
    }).then((entry) => {
      const storedRuleId = entry?.value;
      if (!cancelled && typeof storedRuleId === "number" && storedRuleId > 0) {
        setSelectedRuleId(storedRuleId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roleId, userId]);

  const handleRuleChange = useCallback((nextRuleId: number | null) => {
    const normalizedRuleId = typeof nextRuleId === "number" && nextRuleId > 0
      ? nextRuleId
      : DEFAULT_ROLE_EDIT_RULE_ID;
    setSelectedRuleId(normalizedRuleId);

    if (roleId !== null) {
      void writeMobileKeyValue(`role:${roleId}`, normalizedRuleId, {
        scope: ROLE_EDIT_RULE_STORAGE_SCOPE,
        userId,
      });
    }
  }, [roleId, userId]);

  const handleAvatarSelect = useCallback((avatarId: number) => {
    setSelectedAvatarId(avatarId);
    setAvatarSheetVisible(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
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
      }
      else {
        if (roleId === null) {
          Alert.alert("无法保存", "角色参数无效，请返回后重试。");
          return;
        }
        await updateMutation.mutateAsync({
          roleId,
          roleName: roleName.trim(),
          description: description.trim(),
          ...(selectedAvatarId != null && { avatarId: selectedAvatarId }),
        });
      }
      closeRoleEdit();
    }
    catch (e: any) {
      Alert.alert("保存失败", e?.message ?? "请稍后重试");
    }
  }, [roleName, description, roleType, roleId, isCreating, selectedAvatarId, createMutation, updateMutation, isSaving, closeRoleEdit]);

  const handleDelete = useCallback(async () => {
    if (roleId === null)
      return;
    Alert.alert("确认删除", "删除后无法恢复，确定要删除吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMutation.mutateAsync([roleId]);
            closeRoleEdit();
          }
          catch (e: any) {
            Alert.alert("删除失败", e?.message ?? "请稍后重试");
          }
        },
      },
    ]);
  }, [roleId, deleteMutation, closeRoleEdit]);

  if (isInvalidRoleRoute) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              onPress={closeRoleEdit}
              style={styles.headerBackButton}
              accessibilityLabel="返回"
              accessibilityRole="button"
            >
              <CaretLeft size={22} color={theme.text} weight="bold" />
            </Pressable>
            <ThemedText type="heading" numberOfLines={1} style={styles.headerTitle}>角色参数无效</ThemedText>
          </View>
          <View style={styles.invalidState}>
            <ThemedText themeColor="textSecondary" style={{ textAlign: "center" }}>
              当前角色链接无效，请从角色列表重新打开。
            </ThemedText>
            <Pressable
              onPress={closeRoleEdit}
              style={[styles.invalidBackButton, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText themeColor="accent">返回上一页</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            onPress={closeRoleEdit}
            style={styles.headerBackButton}
            accessibilityLabel="返回"
            accessibilityRole="button"
          >
            <CaretLeft size={22} color={theme.text} weight="bold" />
          </Pressable>
          <ThemedText type="heading" numberOfLines={1} style={styles.headerTitle}>
            {isCreating ? "创建角色" : "编辑角色"}
          </ThemedText>
          <View style={styles.headerActions}>
            {roleId !== null
              ? (
                  <Pressable
                    onPress={handleDelete}
                    disabled={isDeleting}
                    style={[
                      styles.headerActionButton,
                      {
                        borderColor: theme.danger,
                        backgroundColor: theme.dangerMuted,
                        opacity: isDeleting ? 0.5 : 1,
                      },
                    ]}
                    accessibilityLabel="删除角色"
                    accessibilityRole="button"
                  >
                    <Trash size={15} color={theme.danger} weight="bold" />
                    <ThemedText style={[styles.headerActionText, { color: theme.danger }]}>删除</ThemedText>
                  </Pressable>
                )
              : null}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.headerActionButton,
                {
                  borderColor: theme.accent,
                  backgroundColor: theme.accentMuted,
                  opacity: isSaving ? 0.5 : 1,
                },
              ]}
              accessibilityLabel="保存角色"
              accessibilityRole="button"
            >
              <FloppyDisk size={15} color={theme.accent} weight="bold" />
              <ThemedText style={[styles.headerActionText, { color: theme.accent }]}>保存</ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Role Avatar Header */}
          {!isCreating && (
            <View style={styles.profileHeader}>
              <Pressable
                onPress={() => setAvatarSheetVisible(true)}
                accessibilityLabel="编辑角色头像"
                accessibilityRole="button"
                style={[styles.roleAvatarButton, { boxShadow: "none", outlineWidth: 0 }]}
              >
                {avatarThumbSrc
                  ? (
                      <CachedImage
                        uri={avatarThumbSrc}
                        style={styles.roleAvatar}
                        contentFit="cover"
                      />
                    )
                  : (
                      <View style={styles.roleAvatarFallback}>
                        <ThemedText style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
                          {(roleName || "R").slice(0, 1).toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
              </Pressable>
            </View>
          )}

          {/* Basic Info */}
          <View style={[styles.basicInfoSection, !isCreating && styles.basicInfoAfterAvatar]}>
            <TextInput
              style={[styles.input, styles.roleNameInput, { backgroundColor: "rgba(255,255,255,0.008)", color: theme.text }]}
              placeholder="角色名称"
              placeholderTextColor={theme.textSecondary}
              value={roleName}
              onChangeText={setRoleName}
              maxLength={50}
            />
            <View style={[styles.basicInfoDivider, { backgroundColor: theme.border }]} />
            <TextInput
              style={[
                styles.input,
                styles.roleDescriptionInput,
                { backgroundColor: "rgba(255,255,255,0.008)", color: theme.text, height: descriptionInputHeight },
              ]}
              placeholder="角色描述"
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              onContentSizeChange={(event) => {
                setDescriptionInputHeight(Math.max(DESCRIPTION_INPUT_MIN_HEIGHT, event.nativeEvent.contentSize.height));
              }}
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

          {/* Rule Selection */}
          {roleId !== null
            ? (
                <RuleSection
                  selectedRuleId={selectedRuleId}
                  onRuleChange={handleRuleChange}
                />
              )
            : null}

          {/* Ability Editor */}
          {roleId !== null && validSelectedRuleId !== null
            ? <AbilitySection roleId={roleId} ruleId={validSelectedRuleId} />
            : null}
        </ScrollView>
        {roleId !== null
          ? (
              <BottomSheetModal
                visible={avatarSheetVisible}
                onClose={() => setAvatarSheetVisible(false)}
                maxHeight="70%"
                backgroundColor={theme.backgroundElement}
                handleColor={theme.border}
              >
                <AvatarGrid
                  roleId={roleId}
                  currentAvatarId={selectedAvatarId}
                  onAvatarSelect={handleAvatarSelect}
                />
              </BottomSheetModal>
            )
          : null}
      </SafeAreaView>
    </ThemedView>
  );
}
