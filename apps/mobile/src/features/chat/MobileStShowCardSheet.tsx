import { X } from "phosphor-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { StShowCardModel } from "../../components/common/dicer/cmdExe/stShowCard";

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  emptyPanel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.lg,
    minHeight: 38,
    paddingVertical: Spacing.sm,
  },
  rowKey: {
    flex: 1,
  },
  rowValue: {
    minWidth: 72,
    textAlign: "right",
  },
  section: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  sectionHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sectionRows: {
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
  },
});

type MobileStShowCardSheetProps = {
  model: StShowCardModel | null;
  onClose: () => void;
};

export function MobileStShowCardSheet({ model, onClose }: MobileStShowCardSheetProps) {
  const theme = useTheme();

  if (!model) {
    return null;
  }

  const totalRows = model.sections.reduce((total, section) => total + section.rows.length, 0);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="92%"
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={model !== null}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="heading">{model.roleName}</ThemedText>
          <ThemedText themeColor="textSecondary" type="caption">
            属性卡
            {" · "}
            {totalRows}
            {" 项"}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="关闭属性卡"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}
        >
          <X color={theme.textSecondary} size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {model.sections.length === 0
          ? (
              <View style={[styles.emptyPanel, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <ThemedText themeColor="textSecondary">没有可显示的属性。</ThemedText>
              </View>
            )
          : model.sections.map(section => (
              <View
                key={section.title}
                style={[styles.section, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              >
                <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
                  <ThemedText type="smallBold">{section.title}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="caption">
                    {section.rows.length}
                    {" 项"}
                  </ThemedText>
                </View>
                <View style={styles.sectionRows}>
                  {section.rows.map((row, index) => (
                    <View
                      key={`${section.title}-${row.key}`}
                      style={[
                        styles.row,
                        { borderBottomColor: theme.border },
                        index === section.rows.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <ThemedText style={styles.rowKey}>{row.key}</ThemedText>
                      <ThemedText style={styles.rowValue} type="smallBold">{row.value}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ))}
      </ScrollView>
    </BottomSheetModal>
  );
}
