import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

import type { MemberPreviewItem } from "./memberUtils";

import { getMemberDisplayName, getSpaceMemberTypeLabel, sortMemberPreviewItems } from "./memberUtils";

const styles = StyleSheet.create({
  centerState: {
    alignItems: "center",
    gap: Spacing.md,
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
  errorText: {
    color: "#c0392b",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "space-between",
  },
  item: {
    borderRadius: Spacing.xl,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  list: {
    gap: Spacing.md,
  },
});

type MemberPreviewListProps = {
  currentUserId?: number | null;
  emptyText: string;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  maxVisible?: number;
  members: MemberPreviewItem[];
  onLongPress?: (member: MemberPreviewItem) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return fallback;
}

export function MemberPreviewList({
  currentUserId,
  emptyText,
  error,
  isError,
  isPending,
  maxVisible = 6,
  members,
  onLongPress,
}: MemberPreviewListProps) {
  const visibleMembers = useMemo(() => {
    return sortMemberPreviewItems(members).slice(0, maxVisible);
  }, [maxVisible, members]);

  if (isPending) {
    return (
      <ThemedView style={styles.centerState}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">正在加载成员…</ThemedText>
      </ThemedView>
    );
  }

  if (isError) {
    return (
      <ThemedText style={styles.errorText}>
        {getErrorMessage(error, "加载成员失败，请稍后重试。")}
      </ThemedText>
    );
  }

  if (visibleMembers.length === 0) {
    return <ThemedText themeColor="textSecondary">{emptyText}</ThemedText>;
  }

  const hiddenCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <View style={styles.list}>
      {visibleMembers.map(member => (
        <Pressable
          key={String(member.userId ?? getMemberDisplayName(member))}
          onLongPress={onLongPress ? () => onLongPress(member) : undefined}
        >
          <ThemedView
            type="backgroundSelected"
            style={styles.item}
          >
            <View style={styles.header}>
              <ThemedText type="smallBold">
                {getMemberDisplayName(member)}
                {member.userId === currentUserId ? "（你）" : ""}
              </ThemedText>
              {typeof member.memberType === "number"
                ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {getSpaceMemberTypeLabel(member.memberType)}
                    </ThemedText>
                  )
                : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              用户 #
              {member.userId ?? "-"}
            </ThemedText>
          </ThemedView>
        </Pressable>
      ))}
      {hiddenCount > 0
        ? (
            <ThemedText type="small" themeColor="textSecondary">
              还有
              {hiddenCount}
              名成员未展开。
            </ThemedText>
          )
        : null}
    </View>
  );
}
