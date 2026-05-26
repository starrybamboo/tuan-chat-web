import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import type { AnnotationDefinition } from "@tuanchat/domain/annotation-catalog";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getAnnotationCatalog, getAnnotationsByCategory, normalizeAnnotations } from "@tuanchat/domain/annotation-catalog";

import { AnnotationChip } from "./AnnotationChip";

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 0 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  section: { gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
});

type AnnotationPickerSheetProps = {
  visible: boolean;
  annotations: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
};

export function AnnotationPickerSheet({ visible, annotations, onToggle, onClose }: AnnotationPickerSheetProps) {
  const theme = useTheme();
  const normalized = normalizeAnnotations(annotations);
  const activeSet = useMemo(() => new Set(normalized), [normalized]);

  const catalog = useMemo(() => getAnnotationCatalog(), []);
  const byCategory = useMemo(() => getAnnotationsByCategory(catalog), [catalog]);

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="70%"
      onClose={onClose}
      sheetStyle={styles.sheet}
      visible={visible}
    >
      <View style={styles.header}>
        <ThemedText type="heading">消息标注</ThemedText>
        <Pressable onPress={onClose}>
          <ThemedText themeColor="accent">完成</ThemedText>
        </Pressable>
      </View>
      <ScrollView>
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <View key={category} style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">{category}</ThemedText>
            <View style={styles.chips}>
              {items.map((item: AnnotationDefinition) => (
                <AnnotationChip
                  key={item.id}
                  annotation={item}
                  active={activeSet.has(item.id)}
                  onPress={() => onToggle(item.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
}
