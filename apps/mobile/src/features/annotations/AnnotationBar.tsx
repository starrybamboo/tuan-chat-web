import type { AnnotationDefinition } from "./annotationCatalog";

import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { AnnotationChip } from "./AnnotationChip";
import { buildAnnotationMap, normalizeAnnotations } from "./annotationCatalog";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addButton: {
    alignItems: "center",
    borderRadius: Radius.full,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
});

const annotationMap = buildAnnotationMap();

interface AnnotationBarProps {
  annotations: string[] | undefined;
  onToggle?: (id: string) => void;
  onOpenPicker?: () => void;
  canEdit?: boolean;
}

export function AnnotationBar({ annotations, onToggle, onOpenPicker, canEdit }: AnnotationBarProps) {
  const theme = useTheme();
  const normalized = normalizeAnnotations(annotations);

  if (normalized.length === 0 && !canEdit) return null;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {normalized.map((id) => {
          const def = annotationMap.get(id);
          if (!def) {
            return (
              <Pressable key={id} onPress={canEdit ? () => onToggle?.(id) : undefined}>
                <ThemedText style={{ fontSize: 11, color: theme.textSecondary }}>{id}</ThemedText>
              </Pressable>
            );
          }
          return (
            <AnnotationChip
              key={id}
              annotation={def}
              active
              onPress={canEdit ? () => onToggle?.(id) : undefined}
            />
          );
        })}
        {canEdit ? (
          <Pressable onPress={onOpenPicker} style={[styles.addButton, { borderColor: theme.border }]}>
            <SymbolView
              name={{ ios: "plus", android: "add", web: "add" }}
              size={12}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
