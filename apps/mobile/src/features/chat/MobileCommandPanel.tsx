import type { CommandInfo } from "@tuanchat/domain/command-request";

import { filterCommandCatalog, getCommandCatalog } from "@tuanchat/domain/command-catalog";
import { memo, useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { getCommandQuery } from "./mobileCommandQuery";

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    bottom: "100%",
    elevation: 20,
    left: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
    position: "absolute",
    right: Spacing.md,
    zIndex: 20,
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  item: {
    borderRadius: Radius.md,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  itemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
  },
  cmdName: {
    fontSize: 14,
    fontWeight: "600",
  },
  cmdDesc: {
    fontSize: 12,
  },
  cmdUsage: {
    fontSize: 11,
  },
  examples: {
    fontSize: 11,
  },
});

type MobileCommandPanelProps = {
  draftMessage: string;
  onSelectCommand: (command: CommandInfo) => void;
  ruleId: number | null;
};

const commandKeyExtractor = (item: CommandInfo) => item.name;

function MobileCommandPanelInner({ draftMessage, onSelectCommand, ruleId }: MobileCommandPanelProps) {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const query = getCommandQuery(draftMessage);

  const commands = useMemo(() => {
    if (query === null)
      return [];
    const catalog = getCommandCatalog(ruleId);
    if (query === "")
      return catalog;
    return filterCommandCatalog(catalog, query);
  }, [query, ruleId]);

  const renderCommandItem = useCallback(({ item }: { item: CommandInfo }) => (
    <Pressable
      onPress={() => onSelectCommand(item)}
      style={({ pressed }) => [
        styles.item,
        { backgroundColor: pressed ? theme.backgroundSelected : "transparent" },
      ]}
    >
      <View style={styles.itemHeader}>
        <ThemedText style={[styles.cmdName, { color: theme.accent }]}>
          .
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.cmdDesc, { color: theme.textSecondary }]}>
          {item.description}
        </ThemedText>
      </View>
      {item.usage
        ? (
            <ThemedText style={[styles.cmdUsage, { color: theme.textSecondary }]}>
              {item.usage}
            </ThemedText>
          )
        : null}
      {item.examples.length > 0
        ? (
            <ThemedText style={[styles.examples, { color: theme.textSecondary }]}>
              {item.examples.slice(0, 2).join("    ")}
            </ThemedText>
          )
        : null}
    </Pressable>
  ), [onSelectCommand, theme.accent, theme.backgroundSelected, theme.textSecondary]);

  if (query === null || commands.length === 0)
    return null;

  const panelHeight = Math.max(260, height - 180);

  return (
    <FlatList
      data={commands}
      keyExtractor={commandKeyExtractor}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.listContent}
      style={[
        styles.panel,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          height: panelHeight,
        },
      ]}
      renderItem={renderCommandItem}
    />
  );
}

export const MobileCommandPanel = memo(MobileCommandPanelInner);
