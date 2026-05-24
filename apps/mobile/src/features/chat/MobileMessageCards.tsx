import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { ArrowSquareOut, FileText, ListChecks, MapPinLine, X } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { TextEnhanceRenderer } from "@/components/TextEnhanceRenderer";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  getClueCardRenderData,
  getDocCardRenderData,
  getForwardMessageRenderData,
  getRoomJumpRenderData,
  getWebgalChooseRenderData,
} from "@tuanchat/domain/message-render-data";
import {
  collectStateEventScopeLabels,
  formatStateEventAtomDetail,
  formatStateEventPreviewText,
  formatStateScopeLabel,
  getNormalizedStateEventExtra,
} from "@tuanchat/domain/state-event";

import type { RoomRolesById } from "./chat-avatar-utils";

import { getMessagePreview } from "./mobileChatUtils";

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: Spacing.sm,
  },
  cardTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  choiceOption: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  forwardedMessageRow: {
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  forwardDetailButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  introCard: {
    alignSelf: "stretch",
    backgroundColor: "#09090b",
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
    maxWidth: 320,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  introText: {
    color: "#f4f4f5",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  sheetCloseButton: {
    alignItems: "center",
    borderRadius: Radius.md,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sheetContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sheetHeaderText: {
    flex: 1,
    gap: Spacing.xs,
  },
  simpleCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    maxWidth: 300,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stateCard: {
    alignSelf: "center",
    borderRadius: Radius.sm,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    maxWidth: 320,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  stateDetail: {
    borderTopWidth: 1,
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
});

type MessageCardProps = {
  content?: string | null;
  extra: unknown;
};

export function IntroTextCard({ content }: Pick<MessageCardProps, "content">) {
  return (
    <View style={styles.introCard}>
      <TextEnhanceRenderer content={content?.trim() || "幕间文字"} style={styles.introText} />
    </View>
  );
}

export function ForwardMessageCard({ extra }: Pick<MessageCardProps, "extra">) {
  const theme = useTheme();
  const [detailVisible, setDetailVisible] = useState(false);
  const renderData = useMemo(() => getForwardMessageRenderData(extra, 3), [extra]);
  const detailData = useMemo(() => getForwardMessageRenderData(extra, Number.MAX_SAFE_INTEGER), [extra]);

  return (
    <>
      <View style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <View style={styles.cardTitleRow}>
            <ArrowSquareOut color={theme.accent} size={16} />
            <ThemedText type="smallBold">{renderData.title}</ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {renderData.count}
            {" 条"}
          </ThemedText>
        </View>
        {renderData.previewMessages.map((item, index) => (
          <ThemedText key={`${item.message.messageId ?? index}`} numberOfLines={1} style={{ color: theme.textSecondary, fontSize: 12 }}>
            {getMessagePreview(item.message)}
          </ThemedText>
        ))}
        {renderData.remainingCount > 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            还有
            {" "}
            {renderData.remainingCount}
            {" 条消息"}
          </ThemedText>
        ) : null}
        {renderData.hiddenDeletedCount > 0 ? (
          <ThemedText type="caption" themeColor="textSecondary">
            已隐藏
            {" "}
            {renderData.hiddenDeletedCount}
            {" 条已删除消息"}
          </ThemedText>
        ) : null}
        <Pressable
          accessibilityLabel="查看转发详情"
          accessibilityRole="button"
          onPress={() => setDetailVisible(true)}
          style={({ pressed }) => [
            styles.forwardDetailButton,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.accentMuted },
          ]}
        >
          <ThemedText type="caption" themeColor="accent">查看详情</ThemedText>
        </Pressable>
      </View>
      <BottomSheetModal
        backgroundColor={theme.surface}
        handleColor={theme.border}
        maxHeight="86%"
        onClose={() => setDetailVisible(false)}
        visible={detailVisible}
      >
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHeaderText}>
            <ThemedText type="heading">转发消息</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {renderData.count}
              {" 条 · 已隐藏 "}
              {renderData.hiddenDeletedCount}
              {" 条已删除消息"}
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel="关闭转发详情"
            accessibilityRole="button"
            onPress={() => setDetailVisible(false)}
            style={({ pressed }) => [
              styles.sheetCloseButton,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}
          >
            <X color={theme.textSecondary} size={18} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          {detailData.previewMessages.length === 0 ? (
            <View style={[styles.forwardedMessageRow, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText themeColor="textSecondary">没有可显示的转发消息。</ThemedText>
            </View>
          ) : detailData.previewMessages.map((item, index) => (
            <View
              key={`${item.message.messageId ?? index}:forward-detail`}
              style={[styles.forwardedMessageRow, { backgroundColor: theme.backgroundElement }]}
            >
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {item.message.customRoleName?.trim() || `消息 ${index + 1}`}
              </ThemedText>
              <ThemedText style={{ fontSize: 14, lineHeight: 20 }}>{getMessagePreview(item.message)}</ThemedText>
            </View>
          ))}
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}

export function StateEventCard({ message, roomRolesById }: { message: Message; roomRolesById: RoomRolesById }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const roleNameById = useMemo(() => {
    const next: Record<number, string> = {};
    roomRolesById.forEach((role, roleId) => {
      const roleName = role.roleName?.trim();
      if (roleId > 0 && roleName)
        next[roleId] = roleName;
    });
    return next;
  }, [roomRolesById]);
  const stateEvent = useMemo(() => getNormalizedStateEventExtra(message.extra), [message.extra]);
  const scopeLabels = useMemo(
    () => stateEvent ? collectStateEventScopeLabels(stateEvent.events, { roleNameById }) : [],
    [roleNameById, stateEvent],
  );
  const scopeLabelReplacements = useMemo(() => {
    if (!stateEvent)
      return [];

    const seen = new Set<string>();
    return stateEvent.events.flatMap((event) => {
      if (event.type === "nextTurn" || !("scope" in event))
        return [];
      const rawLabel = formatStateScopeLabel(event.scope);
      if (seen.has(rawLabel))
        return [];
      seen.add(rawLabel);
      const displayLabel = formatStateScopeLabel(event.scope, { roleNameById });
      return rawLabel === displayLabel ? [] : [{ rawLabel, displayLabel }];
    });
  }, [roleNameById, stateEvent]);
  const detailLines = useMemo(() => {
    const baseLines = stateEvent
      ? stateEvent.events.map(event => formatStateEventAtomDetail(event, { roleNameById }))
      : ["消息缺少可解析的 stateEvent 结构。"];
    return baseLines.map(line => scopeLabelReplacements.reduce(
      (nextLine, pair) => nextLine.replaceAll(pair.rawLabel, pair.displayLabel),
      line,
    ));
  }, [roleNameById, scopeLabelReplacements, stateEvent]);
  const primaryText = formatStateEventPreviewText(message.extra, message.content).replace(/^\[状态\]\s*/, "");
  const compactPrimaryText = primaryText.replace(/\s*->\s*/g, "→");
  const compactText = scopeLabels.length > 0
    ? `${scopeLabels.join(" / ")} · ${compactPrimaryText}`
    : compactPrimaryText;
  const sourceLabel = stateEvent
    ? `${stateEvent.source.kind}${stateEvent.source.commandName ? ` / ${stateEvent.source.commandName}` : ""} / ${stateEvent.source.parserVersion}`
    : "未知来源";

  return (
    <Pressable onPress={() => setExpanded(value => !value)} style={[styles.stateCard, { backgroundColor: theme.backgroundElement }]}>
      <View style={{ alignItems: "center", flexDirection: "row", gap: Spacing.sm }}>
        <ThemedText style={{ color: theme.textSecondary, flex: 1, fontSize: 12, textAlign: "center" }}>
          {compactText}
        </ThemedText>
        <ThemedText style={{ color: theme.accent, fontSize: 11, fontWeight: "600" }}>
          {expanded ? "收起" : "详情"}
        </ThemedText>
      </View>
      {expanded ? (
        <View style={[styles.stateDetail, { borderTopColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary">原始命令</ThemedText>
          <ThemedText style={{ fontFamily: "monospace", fontSize: 12 }}>{message.content || "[空命令]"}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            来源：
            {sourceLabel}
          </ThemedText>
          {detailLines.map((line, index) => (
            <ThemedText key={`${message.messageId}:state-detail:${index}`} style={{ color: theme.textSecondary, fontSize: 12 }}>
              {line}
            </ThemedText>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export function WebgalChooseCard({ content, extra }: MessageCardProps) {
  const theme = useTheme();
  const data = useMemo(() => getWebgalChooseRenderData(extra, content ?? ""), [content, extra]);

  return (
    <View style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.cardTitleRow}>
          <ListChecks color={theme.accent} size={16} />
          <ThemedText type="smallBold">{data.title}</ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {data.options.length}
          {" 项"}
        </ThemedText>
      </View>
      <ThemedText style={{ fontSize: 13, lineHeight: 19 }}>{data.prompt || data.summary}</ThemedText>
      {data.options.map((option, index) => (
        <View key={`${option.code ?? index}:option`} style={[styles.choiceOption, { borderColor: theme.border }]}>
          <ThemedText style={{ fontSize: 12 }}>{option.text}</ThemedText>
        </View>
      ))}
    </View>
  );
}

export function DocCard({ content, extra }: MessageCardProps) {
  const theme = useTheme();
  const data = useMemo(() => getDocCardRenderData(extra, content ?? ""), [content, extra]);
  const meta = [data.docId ? `ID ${data.docId}` : "", data.spaceId ? `空间 ${data.spaceId}` : ""].filter(Boolean).join(" · ");

  return (
    <View style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.cardTitleRow}>
          <FileText color={theme.accent} size={16} />
          <ThemedText type="smallBold" numberOfLines={1}>{data.title}</ThemedText>
        </View>
      </View>
      {data.excerpt ? <ThemedText style={{ fontSize: 12, lineHeight: 18 }} numberOfLines={3}>{data.excerpt}</ThemedText> : null}
      <ThemedText type="caption" themeColor="textSecondary">{meta || "文档卡片"}</ThemedText>
    </View>
  );
}

export function ClueCard({ content, extra }: MessageCardProps) {
  const theme = useTheme();
  const data = useMemo(() => getClueCardRenderData(extra, content ?? ""), [content, extra]);
  const previewText = useMemo(
    () => getMessagePreview({ ...data.snapshot, status: 0 } as Message),
    [data.snapshot],
  );

  return (
    <View style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.cardTitleRow}>
          <ThemedText style={{ color: theme.accent, fontSize: 15, fontWeight: "700" }}>?</ThemedText>
          <ThemedText type="smallBold" numberOfLines={1}>线索</ThemedText>
        </View>
      </View>
      <ThemedText style={{ fontSize: 12, lineHeight: 18 }} numberOfLines={4}>{previewText || "线索"}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">消息快照</ThemedText>
    </View>
  );
}

export function RoomJumpCard({ content, extra }: MessageCardProps) {
  const theme = useTheme();
  const data = useMemo(() => getRoomJumpRenderData(extra, content ?? ""), [content, extra]);
  const meta = [data.spaceName, data.categoryName, data.roomName].filter(Boolean).join(" / ");

  return (
    <View style={[styles.simpleCard, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
      <View style={styles.cardTitleRow}>
        <MapPinLine color={theme.accent} size={16} />
        <View style={{ flex: 1 }}>
          <ThemedText style={{ color: theme.accent, fontSize: 13, fontWeight: "700" }} numberOfLines={1}>{data.label}</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">{meta || "群聊跳转"}</ThemedText>
        </View>
      </View>
    </View>
  );
}

export function shouldRenderMobileMessageTextPreview(messageType?: number | null): boolean {
  return messageType !== MESSAGE_TYPE.IMG
    && messageType !== MESSAGE_TYPE.VIDEO
    && messageType !== MESSAGE_TYPE.SOUND
    && messageType !== MESSAGE_TYPE.COMMAND_REQUEST
    && messageType !== MESSAGE_TYPE.INTRO_TEXT
    && messageType !== MESSAGE_TYPE.FORWARD
    && messageType !== MESSAGE_TYPE.STATE_EVENT
    && messageType !== MESSAGE_TYPE.WEBGAL_CHOOSE
    && messageType !== MESSAGE_TYPE.DOC_CARD
    && messageType !== MESSAGE_TYPE.CLUE_CARD
    && messageType !== MESSAGE_TYPE.ROOM_JUMP;
}
