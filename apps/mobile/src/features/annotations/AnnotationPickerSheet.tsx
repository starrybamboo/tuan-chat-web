import type { AnnotationDefinition } from "@tuanchat/domain/annotation-catalog";

import { getAnnotationCatalog, getAnnotationsByCategory, normalizeAnnotations } from "@tuanchat/domain/annotation-catalog";
import { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { AnnotationChip } from "./AnnotationChip";

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: "70%", paddingBottom: 40 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg },
  handle: { alignSelf: "center", backgroundColor: "#555", borderRadius: 3, height: 4, marginTop: Spacing.md, width: 36 },
  section: { gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
});

interface AnnotationPickerSheetProps {
  visible: boolean;
  annotations: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}

export function AnnotationPickerSheet({ visible, annotations, onToggle, onClose }: AnnotationPickerSheetProps) {
  const theme = useTheme();
  const normalized = normalizeAnnotations(annotations);
  const activeSet = useMemo(() => new Set(normalized), [normalized]);

  const catalog = useMemo(() => getAnnotationCatalog(), []);
  const byCategory = useMemo(() => getAnnotationsByCategory(catalog), [catalog]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
