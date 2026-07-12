import { ArrowLeftIcon, MagnifyingGlassIcon, SortAscendingIcon, SortDescendingIcon, XIcon } from "@phosphor-icons/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { useGetRoomAllRoleQuery, useGetRoomInfoQuery, useGetSpaceMembersQuery } from "api/hooks/chatQueryHooks";

import { useChatHistory } from "@/components/chat/infra/localDb/useChatHistory";
import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";
import { Button } from "@/components/common/Button";
import { Surface, Text } from "@/components/common/DesignLanguage";
import { formControlShellClassName } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import { ImeAwareSearchInput } from "@/components/common/imeAwareSearchInput";
import { StateView } from "@/components/common/StateView";
import { useGlobalUserId } from "@/components/globalContextProvider";

import { type ChatMessageSearchOrder, searchChatMessages } from "./chatMessageSearch";
import ChatSearchResultItem from "./chatSearchResultItem";

type ChatMessageSearchPageProps = {
  spaceId: number;
  roomId: number;
  query: string;
  onBack: () => void;
  onQueryChange: (query: string) => void;
  onSelectMessage: (messageId: number) => void;
};

export default function ChatMessageSearchPage({
  spaceId,
  roomId,
  query,
  onBack,
  onQueryChange,
  onSelectMessage,
}: ChatMessageSearchPageProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [order, setOrder] = useState<ChatMessageSearchOrder>("newest");
  const deferredQuery = useDeferredValue(draftQuery);
  const history = useChatHistory(roomId);
  const roomQuery = useGetRoomInfoQuery(roomId);
  const roomRolesQuery = useGetRoomAllRoleQuery(roomId);
  const spaceMembersQuery = useGetSpaceMembersQuery(spaceId);
  const currentUserId = useGlobalUserId();
  const roomRoles = roomRolesQuery.data?.data?.allRoles ?? [];
  const spaceMembers = spaceMembersQuery.data?.data ?? [];

  useEffect(() => {
    setDraftQuery(current => current === query ? current : query);
  }, [query]);

  const currentMember = useMemo(
    () => spaceMembers.find(member => member.userId === currentUserId),
    [currentUserId, spaceMembers],
  );
  const visibleMessages = useMemo(() => filterVisibleChatMessages(history.messages, {
    currentUserId,
    memberType: currentMember?.memberType,
  }), [currentMember?.memberType, currentUserId, history.messages]);
  const rolesById = useMemo(
    () => new Map(roomRoles.map(role => [role.roleId, role])),
    [roomRoles],
  );
  const membersById = useMemo(
    () => new Map(spaceMembers.map(member => [member.userId ?? -1, member])),
    [spaceMembers],
  );
  const roleNamesById = useMemo(
    () => new Map(roomRoles.map(role => [role.roleId, role.roleName ?? ""])),
    [roomRoles],
  );
  const userNamesById = useMemo(
    () => new Map(spaceMembers.map(member => [member.userId ?? -1, member.username ?? ""])),
    [spaceMembers],
  );
  const results = useMemo(() => searchChatMessages(visibleMessages, deferredQuery, {
    roleNamesById,
    userNamesById,
  }, order), [deferredQuery, order, roleNamesById, userNamesById, visibleMessages]);
  const normalizedQuery = deferredQuery.trim();

  const handleDraftChange = (value: string) => {
    setDraftQuery(value);
  };

  const handleCommittedChange = (value: string) => {
    onQueryChange(value.slice(0, 120));
  };

  const clearSearch = () => {
    setDraftQuery("");
    onQueryChange("");
  };

  return (
    <div className="flex size-full min-h-0 flex-col overflow-hidden bg-base-100">
      <header className="shrink-0 border-b border-base-300 bg-base-100/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <IconButton
            icon={<ArrowLeftIcon className="size-5" weight="regular" />}
            label="返回房间"
            tooltip="返回房间"
            tooltipPlacement="bottom"
            variant="ghost"
            size="sm"
            shape="square"
            onClick={onBack}
          />
          <div className="min-w-0 flex-1">
            <Text as="h1" variant="componentTitle" wrap="truncate">搜索聊天记录</Text>
            <Text as="p" variant="supporting" wrap="truncate">
              {roomQuery.data?.data?.name ?? `房间 ${roomId}`}
            </Text>
          </div>
        </div>

        <div className="mx-auto mt-3 w-full max-w-5xl">
          <div className={formControlShellClassName({
            surface: "muted",
            className: "h-11 gap-2 px-3 shadow-xs focus-within:shadow-sm",
          })}>
            <MagnifyingGlassIcon className="size-5 shrink-0 text-base-content/45" aria-hidden="true" />
            <ImeAwareSearchInput
              autoFocus
              appearance="bare"
              aria-label="搜索聊天记录"
              autoComplete="off"
              className="h-full min-w-0 flex-1 px-0! py-0! text-sm"
              maxLength={120}
              placeholder="搜索消息、角色或成员"
              type="search"
              value={draftQuery}
              onValueChange={handleDraftChange}
              onCommitValueChange={handleCommittedChange}
              onEscape={() => {
                if (draftQuery) {
                  clearSearch();
                  return;
                }
                onBack();
              }}
              onSubmit={handleCommittedChange}
            />
            {draftQuery
              ? (
                  <IconButton
                    icon={<XIcon className="size-4" />}
                    label="清空搜索"
                    variant="ghost"
                    size="xs"
                    shape="square"
                    onClick={clearSearch}
                  />
                )
              : null}
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-base-200/55 px-3 py-4 sm:px-5 sm:py-6">
        <div className="mx-auto w-full max-w-5xl">
          {normalizedQuery
            ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Text variant="data" aria-live="polite">
                    {history.loading ? "正在读取聊天记录" : `${results.length} 条结果`}
                  </Text>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={order === "newest" ? "info" : "ghost"}
                      size="xs"
                      className="gap-1"
                      aria-pressed={order === "newest"}
                      onClick={() => setOrder("newest")}
                    >
                      <SortDescendingIcon className="size-4" />
                      最新
                    </Button>
                    <Button
                      variant={order === "oldest" ? "info" : "ghost"}
                      size="xs"
                      className="gap-1"
                      aria-pressed={order === "oldest"}
                      onClick={() => setOrder("oldest")}
                    >
                      <SortAscendingIcon className="size-4" />
                      最早
                    </Button>
                  </div>
                </div>
              )
            : null}

          {history.loading && history.messages.length === 0
            ? <StateView loading title="正在读取聊天记录" className="min-h-72" />
            : history.error && history.messages.length === 0
              ? (
                  <StateView
                    kind="error"
                    title="聊天记录读取失败"
                    description={history.error.message}
                    className="min-h-72"
                  />
                )
              : !normalizedQuery
                  ? (
                      <StateView
                        kind="empty"
                        icon={<MagnifyingGlassIcon className="size-12 text-base-content/25" />}
                        title="搜索当前房间"
                        description="输入消息内容、角色名或成员名"
                        className="min-h-72"
                      />
                    )
                  : results.length === 0
                    ? (
                        <StateView
                          kind="empty"
                          icon={<MagnifyingGlassIcon className="size-12 text-base-content/25" />}
                          title="没有找到相关聊天记录"
                          description="尝试缩短关键词或换一个称呼"
                          className="min-h-72"
                        />
                      )
                    : (
                        <Surface level="content" className="divide-y divide-base-300 overflow-hidden border border-base-300 shadow-xs">
                          {results.map(message => (
                            <ChatSearchResultItem
                              key={message.message.messageId}
                              message={message}
                              query={normalizedQuery}
                              role={typeof message.message.roleId === "number" ? rolesById.get(message.message.roleId) : undefined}
                              member={membersById.get(message.message.userId)}
                              onSelect={() => onSelectMessage(message.message.messageId)}
                            />
                          ))}
                        </Surface>
                      )}
        </div>
      </main>
    </div>
  );
}
