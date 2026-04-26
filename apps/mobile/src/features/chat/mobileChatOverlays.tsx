import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { MemberPreviewItem } from "@/features/members/memberUtils";
import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { MemberPreviewList } from "@/features/members/memberPreviewList";
import {
  getCurrentMemberIdentityText,
  getCurrentRoomPresenceText,
} from "@/features/members/memberUtils";
import { useTheme } from "@/hooks/use-theme";

import {
  formatMessageDateTime,
  getErrorMessage,
  getMessageAuthorLabel,
  getMessagePreview,
} from "./mobileChatUtils";

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    flex: 1,
  },
  menuSafeArea: {
    alignItems: "flex-end",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    width: "100%",
  },
  dropdownMenu: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    padding: Spacing.two,
    width: 224,
  },
  fullScreenPanel: {
    flex: 1,
  },
  searchHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  searchBarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  searchBackButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  searchInputWrap: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 40,
    paddingVertical: Spacing.one,
  },
  searchSummary: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  centeredState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  stateIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  actionList: {
    gap: Spacing.one,
  },
  actionItem: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  scrollContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  messageCard: {
    borderRadius: Spacing.three,
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  helperBlock: {
    gap: Spacing.one,
  },
  membersBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  membersSafeArea: {
    maxWidth: 420,
    width: "88%",
  },
  membersPanel: {
    borderBottomLeftRadius: Spacing.four,
    borderTopLeftRadius: Spacing.four,
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  membersHeader: {
    gap: Spacing.one,
  },
  membersHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "space-between",
  },
  closeChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  errorText: {
    color: "#c0392b",
  },
});

function SheetActionItem({
  label,
  onPress,
  subtitle,
}: {
  label: string;
  onPress: () => void;
  subtitle: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionItem,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
      <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
    </Pressable>
  );
}

interface MobileChatToolSheetProps {
  isRefreshing: boolean;
  onClose: () => void;
  onOpenMembers: () => void;
  onOpenSearch: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
  roomName: string;
  spaceName: string;
  visible: boolean;
}

export function MobileChatToolSheet({
  isRefreshing,
  onClose,
  onOpenMembers,
  onOpenSearch,
  onRefresh,
  onSignOut,
  roomName,
  spaceName,
  visible,
}: MobileChatToolSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={{ flex: 1 }} />
        <SafeAreaView edges={["top"]} style={styles.menuSafeArea}>
          <ThemedView type="backgroundElement" style={styles.dropdownMenu}>
            <ThemedText type="smallBold">工具菜单</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {spaceName}
              {" · "}
              {roomName}
            </ThemedText>
            <View style={styles.actionList}>
              <SheetActionItem
                label="搜索消息"
                onPress={onOpenSearch}
                subtitle="在当前房间消息流里快速定位回复锚点。"
              />
              <SheetActionItem
                label="房间成员"
                onPress={onOpenMembers}
                subtitle="打开当前房间成员列表，显示合并后的空间身份。"
              />
              <SheetActionItem
                label={isRefreshing ? "正在刷新…" : "刷新数据"}
                onPress={onRefresh}
                subtitle="重新拉取空间、房间、成员和消息列表。"
              />
              <SheetActionItem
                label="退出登录"
                onPress={onSignOut}
                subtitle="清理本地登录态并返回登录页。"
              />
            </View>
            <Pressable
              onPress={onClose}
              style={[
                styles.closeChip,
                {
                  alignSelf: "flex-end",
                  backgroundColor: theme.background,
                },
              ]}
            >
              <ThemedText type="smallBold">收起</ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

interface MobileChatSearchSheetProps {
  currentRoomName: string;
  onChangeQuery: (nextValue: string) => void;
  onClose: () => void;
  onSelectMessage: (message: Message) => void;
  query: string;
  results: Message[];
  visible: boolean;
}

export function MobileChatSearchSheet({
  currentRoomName,
  onChangeQuery,
  onClose,
  onSelectMessage,
  query,
  results,
  visible,
}: MobileChatSearchSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
      visible={visible}
    >
      <ThemedView style={styles.fullScreenPanel}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.fullScreenPanel}>
          <ThemedView type="background" style={styles.fullScreenPanel}>
            <View
              style={[
                styles.searchHeader,
                {
                  borderBottomColor: theme.backgroundSelected,
                  backgroundColor: theme.background,
                },
              ]}
            >
              <View style={styles.searchBarRow}>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.searchBackButton,
                    {
                      backgroundColor: theme.backgroundElement,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "chevron.left", android: "arrow_back", web: "chevron_left" }}
                    size={18}
                    tintColor={theme.text}
                    weight="semibold"
                  />
                </Pressable>
                <View
                  style={[
                    styles.searchInputWrap,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <SymbolView
                    name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                    size={16}
                    tintColor={theme.textSecondary}
                  />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus={visible}
                    onChangeText={onChangeQuery}
                    placeholder="搜索聊天记录..."
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.searchInput,
                      {
                        color: theme.text,
                      },
                    ]}
                    value={query}
                  />
                  {query.trim().length > 0
                    ? (
                        <Pressable onPress={() => onChangeQuery("")}>
                          <SymbolView
                            name={{ ios: "xmark.circle.fill", android: "cancel", web: "close" }}
                            size={16}
                            tintColor={theme.textSecondary}
                          />
                        </Pressable>
                      )
                    : null}
                </View>
              </View>
            </View>

            {query.trim().length > 0
              ? (
                  <>
                    <View
                      style={[
                        styles.searchSummary,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderBottomColor: theme.backgroundSelected,
                        },
                      ]}
                    >
                      <ThemedText themeColor="textSecondary">
                        找到
                        {" "}
                        {results.length}
                        {" "}
                        条相关记录
                      </ThemedText>
                    </View>
                    {results.length > 0
                      ? (
                          <ScrollView contentContainerStyle={styles.scrollContent}>
                            {results.map(message => (
                              <Pressable
                                key={String(message.messageId ?? `${message.userId}-${message.createTime}`)}
                                onPress={() => onSelectMessage(message)}
                              >
                                <ThemedView type="backgroundElement" style={styles.messageCard}>
                                  <ThemedText type="smallBold">
                                    {getMessageAuthorLabel(message)}
                                    {" · "}
                                    {formatMessageDateTime(message.createTime)}
                                  </ThemedText>
                                  <ThemedText>{getMessagePreview(message)}</ThemedText>
                                  <ThemedText themeColor="textSecondary" type="small">
                                    消息 #
                                    {message.messageId ?? "-"}
                                    {" · 点击后设为回复锚点"}
                                  </ThemedText>
                                </ThemedView>
                              </Pressable>
                            ))}
                          </ScrollView>
                        )
                      : (
                          <View style={styles.centeredState}>
                            <ThemedView type="backgroundElement" style={styles.stateIconWrap}>
                              <SymbolView
                                name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                                size={28}
                                tintColor={theme.textSecondary}
                              />
                            </ThemedView>
                            <ThemedText type="smallBold">没有找到匹配的聊天记录</ThemedText>
                            <ThemedText themeColor="textSecondary">尝试使用不同的关键词搜索</ThemedText>
                          </View>
                        )}
                  </>
                )
              : (
                  <View style={styles.centeredState}>
                    <ThemedView type="backgroundElement" style={styles.stateIconWrap}>
                      <SymbolView
                        name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                        size={28}
                        tintColor={theme.textSecondary}
                      />
                    </ThemedView>
                    <ThemedText type="smallBold">搜索消息</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      输入关键词搜索消息内容、作者或消息编号
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      当前房间：
                      {currentRoomName}
                    </ThemedText>
                  </View>
                )}
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

interface MobileChatMembersSheetProps {
  currentRoomMember: MemberPreviewItem | null;
  currentSpaceMember: MemberPreviewItem | null;
  currentUserId: number | null;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  members: MemberPreviewItem[];
  onClose: () => void;
  roomName: string;
  visible: boolean;
}

export function MobileChatMembersSheet({
  currentRoomMember,
  currentSpaceMember,
  currentUserId,
  error,
  isError,
  isPending,
  members,
  onClose,
  roomName,
  visible,
}: MobileChatMembersSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.membersBackdrop}>
        <Pressable onPress={onClose} style={{ flex: 1 }} />
        <SafeAreaView edges={["top", "bottom"]} style={styles.membersSafeArea}>
          <ThemedView type="backgroundElement" style={styles.membersPanel}>
            <View style={styles.membersHeader}>
              <View style={styles.membersHeaderRow}>
                <ThemedText type="smallBold">房间成员</ThemedText>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.closeChip,
                    {
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <ThemedText type="smallBold">返回聊天</ThemedText>
                </Pressable>
              </View>
              <ThemedText themeColor="textSecondary">
                当前房间：
                {roomName}
              </ThemedText>
            </View>

            <View style={styles.helperBlock}>
              <ThemedText themeColor="textSecondary">
                {getCurrentMemberIdentityText(currentSpaceMember)}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {getCurrentRoomPresenceText(currentRoomMember, currentSpaceMember)}
              </ThemedText>
              {isError
                ? (
                    <ThemedText style={styles.errorText}>
                      {getErrorMessage(error, "加载成员失败，请稍后重试。")}
                    </ThemedText>
                  )
                : null}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <MemberPreviewList
                currentUserId={currentUserId}
                emptyText="当前房间还没有可显示成员。"
                error={error}
                isError={isError}
                isPending={isPending}
                maxVisible={Math.max(members.length, 1)}
                members={members}
              />
            </ScrollView>
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
