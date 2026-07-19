import type { AbilityByRuleFieldUpdateRequest } from "@tuanchat/openapi-client/models/AbilityByRuleFieldUpdateRequest";
import type { IconProps } from "phosphor-react-native";
import type { ComponentType, ReactNode } from "react";

import { CardsIcon, GaugeIcon, IdentificationCardIcon, MaskHappyIcon, SwordIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { MobileStateView } from "@/components/MobileStateView";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import {
  useAbilityByRuleAndRoleQuery,
  useSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "@/features/roles/useAbilityMutations";
import { useRuleDetailQuery } from "@/features/roles/useRuleQueries";
import { useTheme } from "@/hooks/use-theme";

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
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tagItem: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
  },
  carousel: {
    overflow: "visible",
  },
  carouselTrack: {
    alignItems: "flex-start",
    flexDirection: "row",
    overflow: "visible",
  },
  carouselFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dot: {
    borderRadius: Radius.full,
    height: 7,
    width: 7,
  },
  sectionPage: {
    paddingRight: Spacing.md,
  },
  numericColumns: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  numericColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  numericRow: {
    alignItems: "center",
    borderRadius: Radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetContent: {
    gap: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  sheetLabel: {
    marginBottom: Spacing.xs,
  },
  sheetInput: {
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheetButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  createSection: {
    alignItems: "center",
    borderRadius: Radius.xl,
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },
});

type SectionKey = "act" | "basic" | "ability" | "skill" | "extra";

type AbilityDisplaySection = {
  fields: Record<string, string>;
  key: SectionKey;
  label: string;
};

type SectionIconComponent = ComponentType<IconProps>;

const SECTION_ICON_MAP: Record<SectionKey, SectionIconComponent> = {
  act: MaskHappyIcon,
  basic: IdentificationCardIcon,
  ability: GaugeIcon,
  skill: SwordIcon,
  extra: CardsIcon,
};

const SECTION_LABELS: Record<SectionKey, string> = {
  act: "表演",
  basic: "基础",
  ability: "属性",
  skill: "技能",
  extra: "额外",
};

const NUMERIC_SECTIONS: SectionKey[] = ["basic", "ability", "skill"];
const CAROUSEL_SWIPE_DISTANCE = 44;
const CAROUSEL_SWIPE_VELOCITY = 350;
const CAROUSEL_SPRING_CONFIG = {
  damping: 22,
  mass: 0.7,
  reduceMotion: ReduceMotion.System,
  stiffness: 220,
} as const;

function isNumericValue(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

function getAbilityErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "请稍后重试";
}

function buildAbilityFieldUpdateRequest({
  field,
  nextField,
  roleId,
  ruleId,
  section,
}: {
  field: string;
  nextField: string | null;
  roleId: number;
  ruleId: number;
  section: SectionKey;
}): AbilityByRuleFieldUpdateRequest {
  // 后端以 null 表示删除字段，但生成客户端仍把 map 值声明为 string。
  const fields = { [field]: nextField } as Record<string, string>;
  const base = { roleId, ruleId };
  switch (section) {
    case "act":
      return { ...base, actFields: fields };
    case "basic":
      return { ...base, basicFields: fields };
    case "ability":
      return { ...base, abilityFields: fields };
    case "skill":
      return { ...base, skillFields: fields };
    case "extra":
      return { ...base, extraFields: fields };
  }
}

function AbilitySheetContent({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      contentContainerStyle={styles.sheetContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

type AbilitySectionProps = {
  roleId: number;
  ruleId: number;
  /** Runs before the active carousel page changes, usually to reset the parent scroll position. */
  onBeforeActiveSectionChange?: () => void;
};

export function AbilitySection({ roleId, ruleId, onBeforeActiveSectionChange }: AbilitySectionProps) {
  const theme = useTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const abilityQuery = useAbilityByRuleAndRoleQuery(roleId, ruleId);
  const ruleDetailQuery = useRuleDetailQuery(ruleId);
  const setAbilityMutation = useSetRoleAbilityMutation();
  const updateAbilityMutation = useUpdateRoleAbilityByRoleIdMutation();
  const updateFieldMutation = useUpdateKeyFieldByRoleIdMutation();
  const {
    data: ability,
    isError: abilityIsError,
    isLoading: abilityIsLoading,
    refetch: refetchAbility,
  } = abilityQuery;
  const {
    data: rule,
    isError: ruleIsError,
    isLoading: ruleIsLoading,
    refetch: refetchRule,
  } = ruleDetailQuery;
  const { isPending: abilityCreateIsPending, mutateAsync: setAbility } = setAbilityMutation;
  const { mutateAsync: updateAbility } = updateAbilityMutation;
  const { mutateAsync: updateAbilityField } = updateFieldMutation;
  const abilityKey = `${roleId}:${ruleId}`;

  const [editingField, setEditingField] = useState<{
    section: SectionKey;
    key: string;
    value: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingSection, setAddingSection] = useState<SectionKey | null>(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [renamingField, setRenamingField] = useState<{
    section: SectionKey;
    key: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Partial<Record<SectionKey, number>>>({});
  const [abilityCreateError, setAbilityCreateError] = useState<{ key: string; message: string } | null>(null);

  const sections = useMemo(() => {
    const result: AbilityDisplaySection[] = [];
    const sectionKeys: SectionKey[] = ["act", "basic", "ability", "skill", "extra"];

    for (const key of sectionKeys) {
      const data = ability?.[key];
      const template = key === "act"
        ? rule?.actTemplate
        : key === "basic"
          ? rule?.basicDefault
          : key === "ability"
            ? rule?.abilityFormula
            : key === "skill"
              ? rule?.skillDefault
              : undefined;

      const templateFields = template as Record<string, string> | undefined;
      const fields = key === "extra"
        ? data
        : key === "act"
          ? (data ?? templateFields)
          : data && Object.keys(data).length > 0
            ? data
            : templateFields;
      if (fields && Object.keys(fields).length > 0) {
        result.push({ key, label: SECTION_LABELS[key], fields });
      }
    }
    return result;
  }, [ability, rule]);
  const carouselSidePeek = Spacing.xl;
  const pageWidth = Math.max(240, windowWidth - Spacing.xxl * 2 - carouselSidePeek * 2);
  const trackTranslateX = useSharedValue<number>(carouselSidePeek);
  const activeSectionIndexShared = useSharedValue<number>(0);
  const pageCount = sections.length;
  const resolvedActiveSectionIndex = pageCount === 0 ? 0 : Math.min(activeSectionIndex, pageCount - 1);
  const displayIndex = pageCount === 0 ? 0 : resolvedActiveSectionIndex + 1;
  const activeSectionKey = sections[resolvedActiveSectionIndex]?.key;
  const activeCarouselHeight = activeSectionKey ? (measuredHeights[activeSectionKey] ?? Math.max(240, Math.round(windowHeight * 0.28))) : Math.max(240, Math.round(windowHeight * 0.28));

  const handleFieldPress = useCallback((section: SectionKey, key: string, value: string) => {
    setEditingField({ section, key, value });
    setEditValue(value);
  }, []);

  const handleFieldSave = useCallback(async () => {
    if (!editingField)
      return;
    try {
      await updateAbility({
        roleId,
        ruleId,
        [editingField.section]: { [editingField.key]: editValue },
      });
      setEditingField(null);
    }
    catch (error) {
      Alert.alert("保存失败", getAbilityErrorMessage(error));
    }
  }, [editingField, editValue, roleId, ruleId, updateAbility]);

  const handleFieldDelete = useCallback(async () => {
    if (!editingField)
      return;
    const doDelete = async () => {
      try {
        await updateAbilityField(buildAbilityFieldUpdateRequest({
          field: editingField.key,
          nextField: null,
          roleId,
          ruleId,
          section: editingField.section,
        }));
        setEditingField(null);
      }
      catch (error) {
        Alert.alert("删除失败", getAbilityErrorMessage(error));
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm(`确定要删除 "${editingField.key}" 吗？`))
        void doDelete();
    }
    else {
      Alert.alert("删除字段", `确定要删除 "${editingField.key}" 吗？`, [
        { text: "取消", style: "cancel" },
        { text: "删除", style: "destructive", onPress: () => void doDelete() },
      ]);
    }
  }, [editingField, roleId, ruleId, updateAbilityField]);

  const handleFieldRename = useCallback(() => {
    if (!editingField)
      return;
    setRenamingField({ section: editingField.section, key: editingField.key });
    setRenameValue(editingField.key);
    setEditingField(null);
  }, [editingField]);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingField || !renameValue.trim() || renameValue.trim() === renamingField.key) {
      setRenamingField(null);
      return;
    }
    try {
      await updateAbilityField(buildAbilityFieldUpdateRequest({
        field: renamingField.key,
        nextField: renameValue.trim(),
        roleId,
        ruleId,
        section: renamingField.section,
      }));
      setRenamingField(null);
    }
    catch (error) {
      Alert.alert("重命名失败", getAbilityErrorMessage(error));
    }
  }, [renamingField, renameValue, roleId, ruleId, updateAbilityField]);

  const handleAddField = useCallback(async () => {
    if (!addingSection || !newFieldName.trim())
      return;
    try {
      await updateAbility({
        roleId,
        ruleId,
        [addingSection]: { [newFieldName.trim()]: "" },
      });
      setAddingSection(null);
      setNewFieldName("");
    }
    catch (error) {
      Alert.alert("添加失败", getAbilityErrorMessage(error));
    }
  }, [addingSection, newFieldName, roleId, ruleId, updateAbility]);

  const handleCreateAbility = useCallback(async () => {
    setAbilityCreateError(null);
    try {
      await setAbility({
        roleId,
        ruleId,
        act: (rule?.actTemplate as Record<string, string>) ?? {},
        basic: (rule?.basicDefault as Record<string, string>) ?? {},
        ability: (rule?.abilityFormula as Record<string, string>) ?? {},
        skill: (rule?.skillDefault as Record<string, string>) ?? {},
      });
    }
    catch (error) {
      setAbilityCreateError({ key: abilityKey, message: getAbilityErrorMessage(error) });
    }
  }, [abilityKey, roleId, ruleId, rule, setAbility]);

  const autoCreatedAbilityKeyRef = useRef<string | null>(null);
  const sectionChangeFrameRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (sectionChangeFrameRef.current != null) {
      cancelAnimationFrame(sectionChangeFrameRef.current);
      sectionChangeFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!ability && !abilityIsLoading && !abilityIsError && rule && autoCreatedAbilityKeyRef.current !== abilityKey) {
      autoCreatedAbilityKeyRef.current = abilityKey;
      void handleCreateAbility();
    }
  }, [ability, abilityIsError, abilityIsLoading, abilityKey, handleCreateAbility, rule]);

  const handleRetryAbility = useCallback(() => {
    if (abilityIsError || ruleIsError) {
      autoCreatedAbilityKeyRef.current = null;
      void Promise.all([refetchAbility(), refetchRule()]);
      return;
    }
    autoCreatedAbilityKeyRef.current = abilityKey;
    void handleCreateAbility();
  }, [abilityIsError, abilityKey, handleCreateAbility, refetchAbility, refetchRule, ruleIsError]);

  const animateTrackToIndex = useCallback((index: number) => {
    trackTranslateX.set(withSpring(
      carouselSidePeek - index * pageWidth,
      CAROUSEL_SPRING_CONFIG,
    ));
  }, [carouselSidePeek, pageWidth, trackTranslateX]);

  useEffect(() => {
    activeSectionIndexShared.set(resolvedActiveSectionIndex);
    animateTrackToIndex(resolvedActiveSectionIndex);
  }, [activeSectionIndexShared, animateTrackToIndex, resolvedActiveSectionIndex]);

  const changeActiveSection = useCallback((index: number) => {
    const nextIndex = pageCount === 0 ? 0 : Math.max(0, Math.min(index, pageCount - 1));
    if (nextIndex === resolvedActiveSectionIndex) {
      animateTrackToIndex(nextIndex);
      return;
    }

    onBeforeActiveSectionChange?.();
    if (sectionChangeFrameRef.current != null) {
      cancelAnimationFrame(sectionChangeFrameRef.current);
    }
    sectionChangeFrameRef.current = requestAnimationFrame(() => {
      sectionChangeFrameRef.current = null;
      setActiveSectionIndex(nextIndex);
      animateTrackToIndex(nextIndex);
    });
  }, [animateTrackToIndex, onBeforeActiveSectionChange, pageCount, resolvedActiveSectionIndex]);

  const handleDotPress = useCallback((index: number) => {
    changeActiveSection(index);
  }, [changeActiveSection]);

  const carouselPanGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      cancelAnimation(trackTranslateX);
    })
    .onUpdate((event) => {
      const activeIndex = activeSectionIndexShared.get();
      const leftLimit = activeIndex < pageCount - 1 ? pageWidth : pageWidth * 0.18;
      const rightLimit = activeIndex > 0 ? pageWidth : pageWidth * 0.18;
      const clampedTranslation = Math.max(-leftLimit, Math.min(rightLimit, event.translationX));
      trackTranslateX.set(carouselSidePeek - activeIndex * pageWidth + clampedTranslation);
    })
    .onEnd((event) => {
      const activeIndex = activeSectionIndexShared.get();
      const shouldMove = Math.abs(event.translationX) > CAROUSEL_SWIPE_DISTANCE
        || Math.abs(event.velocityX) > CAROUSEL_SWIPE_VELOCITY;
      if (!shouldMove) {
        trackTranslateX.set(withSpring(
          carouselSidePeek - activeIndex * pageWidth,
          CAROUSEL_SPRING_CONFIG,
        ));
        return;
      }
      const nextIndex = Math.max(0, Math.min(activeIndex + (event.translationX < 0 ? 1 : -1), pageCount - 1));
      scheduleOnRN(changeActiveSection, nextIndex);
    })
    .onFinalize((_event, success) => {
      if (!success) {
        const activeIndex = activeSectionIndexShared.get();
        trackTranslateX.set(withSpring(
          carouselSidePeek - activeIndex * pageWidth,
          CAROUSEL_SPRING_CONFIG,
        ));
      }
    }), [activeSectionIndexShared, carouselSidePeek, changeActiveSection, pageCount, pageWidth, trackTranslateX]);
  const carouselAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackTranslateX.get() }],
  }));

  const handleSectionLayout = useCallback((sectionKey: SectionKey, height: number) => {
    setMeasuredHeights((current) => {
      const previous = current[sectionKey];
      if (previous != null && Math.abs(previous - height) < 1) {
        return current;
      }
      return { ...current, [sectionKey]: height };
    });
  }, []);

  const renderAbilityCard = useCallback((info: { item: AbilityDisplaySection }) => {
    const { item } = info;
    const entries = Object.entries(item.fields);
    const useNumericLayout = NUMERIC_SECTIONS.includes(item.key)
      && entries.some(([, v]) => isNumericValue(String(v ?? "")));
    const SectionIcon = SECTION_ICON_MAP[item.key];

    return (
      <View
        key={item.key}
        onLayout={event => handleSectionLayout(item.key, event.nativeEvent.layout.height)}
        style={[styles.sectionPage, { width: pageWidth }]}
      >
        <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
              <SectionIcon size={18} color={theme.textSecondary} weight="bold" />
              <ThemedText type="heading">{item.label}</ThemedText>
            </View>
            <Pressable
              accessibilityLabel={`添加${item.label}字段`}
              accessibilityRole="button"
              onPress={() => { setAddingSection(item.key); setNewFieldName(""); }}
            >
              <ThemedText themeColor="accent" type="small">+ 添加</ThemedText>
            </Pressable>
          </View>

          {useNumericLayout
            ? (
                <View style={styles.numericColumns}>
                  <View style={styles.numericColumn}>
                    {entries.filter((_, i) => i % 2 === 0).map(([fieldKey, fieldValue]) => (
                      <Pressable
                        key={fieldKey}
                        accessibilityLabel={`编辑字段 ${fieldKey}，当前值 ${String(fieldValue ?? "0")}`}
                        accessibilityRole="button"
                        onPress={() => handleFieldPress(item.key, fieldKey, String(fieldValue ?? ""))}
                        style={[styles.numericRow, { backgroundColor: theme.background }]}
                      >
                        <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                          {fieldKey}
                        </ThemedText>
                        <ThemedText type="smallBold" themeColor="accent">
                          {String(fieldValue ?? "0")}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.numericColumn}>
                    {entries.filter((_, i) => i % 2 === 1).map(([fieldKey, fieldValue]) => (
                      <Pressable
                        key={fieldKey}
                        accessibilityLabel={`编辑字段 ${fieldKey}，当前值 ${String(fieldValue ?? "0")}`}
                        accessibilityRole="button"
                        onPress={() => handleFieldPress(item.key, fieldKey, String(fieldValue ?? ""))}
                        style={[styles.numericRow, { backgroundColor: theme.background }]}
                      >
                        <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                          {fieldKey}
                        </ThemedText>
                        <ThemedText type="smallBold" themeColor="accent">
                          {String(fieldValue ?? "0")}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )
            : (
                <View style={styles.tagGrid}>
                  {entries.map(([fieldKey, fieldValue]) => {
                    const displayText = fieldValue
                      ? `${fieldKey}: ${String(fieldValue).slice(0, 12)}${String(fieldValue).length > 12 ? "…" : ""}`
                      : fieldKey;
                    return (
                      <Pressable
                        key={fieldKey}
                        accessibilityLabel={`编辑字段 ${fieldKey}${fieldValue ? `，当前值 ${String(fieldValue)}` : ""}`}
                        accessibilityRole="button"
                        onPress={() => handleFieldPress(item.key, fieldKey, String(fieldValue ?? ""))}
                        style={[styles.tagItem, { borderColor: theme.border }]}
                      >
                        <ThemedText type="small" numberOfLines={1}>{displayText}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
        </View>
      </View>
    );
  }, [handleFieldPress, handleSectionLayout, pageWidth, theme.background, theme.backgroundElement, theme.border, theme.textSecondary]);

  if (!ability) {
    if (abilityIsError || ruleIsError) {
      return (
        <MobileStateView
          actionLabel="重试"
          onAction={handleRetryAbility}
          title="加载角色能力失败"
          tone="error"
        />
      );
    }
    if (abilityCreateError?.key === abilityKey) {
      return (
        <MobileStateView
          actionLabel="重试"
          onAction={handleRetryAbility}
          title={`创建角色能力失败：${abilityCreateError.message}`}
          tone="error"
        />
      );
    }
    return (
      <MobileStateView
        loading={abilityIsLoading || ruleIsLoading || abilityCreateIsPending}
        title="正在准备角色能力…"
      />
    );
  }

  return (
    <>
      <View>
        <View style={styles.carouselFooter}>
          <View style={styles.dots}>
            {sections.map((section, index) => {
              const active = index === resolvedActiveSectionIndex;
              return (
                <Pressable
                  key={section.key}
                  accessibilityLabel={`切换到${section.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => handleDotPress(index)}
                  style={[
                    styles.dot,
                    { backgroundColor: active ? theme.accent : theme.border },
                    active && { width: 18 },
                  ]}
                />
              );
            })}
          </View>
          <ThemedText themeColor="textSecondary" type="caption">
            {displayIndex}
            /
            {pageCount}
          </ThemedText>
        </View>
        <GestureDetector gesture={carouselPanGesture}>
          <View style={[styles.carousel, { height: activeCarouselHeight }]}>
            <Animated.View style={[styles.carouselTrack, carouselAnimatedStyle]}>
              {sections.map(section => renderAbilityCard({ item: section }))}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      {/* Edit field sheet */}
      <BottomSheetModal visible={!!editingField} onClose={() => setEditingField(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">{editingField?.key}</ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>值</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={editValue}
              onChangeText={setEditValue}
              accessibilityLabel="字段值"
              placeholder="输入值"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityHint="会删除当前字段"
              accessibilityLabel={`删除字段 ${editingField?.key ?? ""}`}
              accessibilityRole="button"
              onPress={handleFieldDelete}
              style={{ marginRight: "auto" }}
            >
              <ThemedText style={{ color: "#ef4444" }} type="small">删除</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel={`重命名字段 ${editingField?.key ?? ""}`}
              accessibilityRole="button"
              onPress={handleFieldRename}
            >
              <ThemedText themeColor="textSecondary" type="small">重命名</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel={`保存字段 ${editingField?.key ?? ""}`}
              accessibilityRole="button"
              onPress={handleFieldSave}
              style={[styles.sheetButton, { backgroundColor: theme.accent }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">保存</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>

      {/* Rename field sheet */}
      <BottomSheetModal visible={!!renamingField} onClose={() => setRenamingField(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">重命名字段</ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>新名称</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={renameValue}
              onChangeText={setRenameValue}
              accessibilityLabel="新字段名称"
              placeholder="新字段名称"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityLabel="取消重命名字段"
              accessibilityRole="button"
              onPress={() => setRenamingField(null)}
            >
              <ThemedText themeColor="textSecondary" type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel="确认重命名字段"
              accessibilityRole="button"
              accessibilityState={{ disabled: !renameValue.trim() || renameValue.trim() === renamingField?.key }}
              onPress={handleRenameConfirm}
              disabled={!renameValue.trim() || renameValue.trim() === renamingField?.key}
              style={[styles.sheetButton, { backgroundColor: theme.accent, opacity: (!renameValue.trim() || renameValue.trim() === renamingField?.key) ? 0.5 : 1 }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">确认</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>

      {/* Add field sheet */}
      <BottomSheetModal visible={!!addingSection} onClose={() => setAddingSection(null)} backgroundColor={theme.backgroundElement} handleColor={theme.border}>
        <AbilitySheetContent>
          <ThemedText type="heading">
            添加到「
            {addingSection ? SECTION_LABELS[addingSection] : ""}
            」
          </ThemedText>
          <View>
            <ThemedText themeColor="textSecondary" type="caption" style={styles.sheetLabel}>字段名称</ThemedText>
            <TextInput
              style={[styles.sheetInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              value={newFieldName}
              onChangeText={setNewFieldName}
              accessibilityLabel="新增字段名称"
              placeholder="输入字段名称"
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
          </View>
          <View style={styles.sheetActions}>
            <Pressable
              accessibilityLabel="取消新增字段"
              accessibilityRole="button"
              onPress={() => setAddingSection(null)}
            >
              <ThemedText themeColor="textSecondary" type="small">取消</ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel="添加字段"
              accessibilityRole="button"
              accessibilityState={{ disabled: !newFieldName.trim() }}
              onPress={handleAddField}
              disabled={!newFieldName.trim()}
              style={[styles.sheetButton, { backgroundColor: theme.accent, opacity: !newFieldName.trim() ? 0.5 : 1 }]}
            >
              <ThemedText style={{ color: "#fff" }} type="small">添加</ThemedText>
            </Pressable>
          </View>
        </AbilitySheetContent>
      </BottomSheetModal>
    </>
  );
}
