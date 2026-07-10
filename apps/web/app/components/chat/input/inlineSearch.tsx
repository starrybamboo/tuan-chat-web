import { useDebounce } from "ahooks";
import { AnimatePresence } from "motion/react";
import { memo, use, useEffect, useMemo, useRef, useState } from "react";

import { RoomContext } from "@/components/chat/core/roomContext";
import MobileSearchPage from "@/components/chat/input/mobileSearchPage";
import SearchedMessage from "@/components/chat/message/preview/searchedMessage";
import useGetRoleSmartly from "@/components/chat/shared/components/useGetRoleName";
import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";
import { ImeAwareSearchInput } from "@/components/common/imeAwareSearchInput";
import { FloatingMotionItem, FloatingMotionPanel } from "@/components/common/motion/FloatingMotionPanel";
import { SearchFilled, XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";

import type { UserRole } from "../../../../api";

type SearchBarProps = {
  className?: string;
}

function SearchBar({ className = "" }: SearchBarProps) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const historyMessages = useMemo(() => filterVisibleChatMessages(roomContext.chatHistory?.messages ?? [], {
    currentUserId: roomContext.curMember?.userId,
    memberType: roomContext.curMember?.memberType,
  }), [roomContext.chatHistory?.messages, roomContext.curMember?.memberType, roomContext.curMember?.userId]);

  const [searchText, setSearchText] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const debouncedSearchText = useDebounce<string>(searchText, { wait: 300 });
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<UserRole[]>([]);
  const getRoleSmartly = useGetRoleSmartly();
  const roleCacheRef = useRef<Map<number, UserRole | null>>(new Map());
  const roleIds = useMemo(() => {
    const ids = new Set<number>();
    for (const msg of historyMessages) {
      const roleId = msg.message.roleId;
      if (typeof roleId === "number" && Number.isFinite(roleId)) {
        ids.add(roleId);
      }
    }
    return Array.from(ids);
  }, [historyMessages]);

  // 检测是否为移动端
  const isMobile = getScreenSize() === "sm";

  useEffect(() => {
    roleCacheRef.current = new Map();
    queueMicrotask(() => setRoles([]));
  }, [roomId]);

  useEffect(() => {
    if (!debouncedSearchText) {
      return;
    }

    let cancelled = false;
    const missingIds = roleIds.filter(id => !roleCacheRef.current.has(id));
    if (missingIds.length === 0) {
      return;
    }

    const getAllRoles = async () => {
      const fetched: UserRole[] = [];
      for (const roleId of missingIds) {
        const role = await getRoleSmartly(roleId);
        if (!role) {
          roleCacheRef.current.set(roleId, null);
          continue;
        }
        const id = role.roleId;
        if (typeof id !== "number" || !Number.isFinite(id))
          continue;
        if (roleCacheRef.current.get(id))
          continue;
        roleCacheRef.current.set(id, role);
        fetched.push(role);
      }

      if (cancelled || fetched.length === 0)
        return;

      setRoles((prev) => {
        const seen = new Set(prev.map(r => r.roleId));
        const next = [...prev];
        for (const role of fetched) {
          const id = role.roleId;
          if (typeof id !== "number" || seen.has(id))
            continue;
          seen.add(id);
          next.push(role);
        }
        return next;
      });
    };

    void getAllRoles();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchText, getRoleSmartly, roleIds]);

  const searchResult = useMemo(() => {
    if (!debouncedSearchText || debouncedSearchText.length === 0)
      return [];
    return historyMessages.filter(message =>
      message.message.content.includes(debouncedSearchText)
      || roles.find(role => role.roleId === message.message.roleId)
        ?.roleName
        ?.includes(debouncedSearchText));
  }, [debouncedSearchText, historyMessages, roles]);

  const handleSearch = () => {
    if (isMobile) {
      // 移动端打开搜索页面
      setIsMobileSearchOpen(true);
    }
    else {
      // 桌面端显示下拉搜索结果
      if (searchText.trim()) {
        setIsSearching(true);
      }
    }
  };

  const handleClear = () => {
    setSearchText("");
    setIsSearching(false);
  };

  // 移动端的简化渲染
  if (isMobile) {
    return (
      <>
        <button
          onClick={handleSearch}
          className="
            p-2 text-base-content/60
            hover:text-info hover:bg-base-300
            rounded-lg transition-colors
          "
          type="button"
          aria-label="搜索聊天记录"
        >
          <SearchFilled className="size-6" />
        </button>

        <MobileSearchPage
          isOpen={isMobileSearchOpen}
          onClose={() => setIsMobileSearchOpen(false)}
        />
      </>
    );
  }

  return (
    <div className={`
      relative
      ${className}
    `}>
      {/* 搜索栏 */}
      <div className="
        flex h-8 items-center gap-1 bg-base-200 rounded-lg overflow-hidden
        border border-base-300
      ">
        <div className="flex h-full items-center flex-1 px-3">
          <ImeAwareSearchInput
            ref={searchInputRef}
            type="text"
            autoComplete="off"
            aria-label="搜索聊天记录"
            placeholder="搜索聊天记录..."
            className="
              bg-transparent border-none outline-none flex-1 text-sm focus:ring-2 focus:ring-info/30
              placeholder:text-base-content/60
            "
            value={searchText}
            onEscape={handleClear}
            onSubmit={handleSearch}
            onValueChange={setSearchText}
          />
          {searchText && (
            <button
              onClick={handleClear}
              className="
                flex items-center justify-center text-base-content/60
                hover:text-base-content
                transition-colors ml-2
              "
              type="button"
              aria-label="清空聊天搜索"
            >
              <XMarkICon className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="
            h-full px-3 flex items-center justify-center text-base-content/60
            hover:text-info hover:bg-base-300
            transition-colors
          "
          disabled={!searchText.trim()}
          type="button"
          aria-label="搜索聊天记录"
          title={searchText.trim() ? "搜索聊天记录" : "请输入关键词"}
        >
          <SearchFilled className="size-4" />
        </button>
      </div>

      {/* 搜索结果下拉 */}
      <AnimatePresence initial={false}>
        {isSearching && debouncedSearchText && (
          <FloatingMotionPanel
            className="
              absolute top-full inset-x-0 mt-1 bg-base-100 border
              border-base-300 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden
            "
          >
            {/* 结果统计 */}
            <div
              aria-live="polite"
              className="
              px-4 py-2 text-xs text-base-content/70 bg-base-200 border-b
              border-base-300
            "
            >
              找到
              {" "}
              {searchResult.length}
              {" "}
              条相关记录
              <button
                className="
                  float-right text-base-content/60
                  hover:text-base-content
                "
                type="button"
                aria-label="关闭搜索结果"
                onClick={() => {
                  setIsSearching(false);
                  searchInputRef.current?.focus();
                }}
              >
                <XMarkICon className="size-3" />
              </button>
            </div>

            {/* 结果列表 */}
            <div className="overflow-y-auto max-h-64">
              {searchResult.length > 0
                ? (
                    searchResult.map((message, index) => {
                      const senderRole = roles.find(r => r.roleId === message.message.roleId);
                      const senderName = senderRole?.roleName
                        || message.message.customRoleName
                        || `角色${message.message.roleId}`;
                      const timeLabel = message.message.createTime
                        ? new Date(message.message.createTime).toLocaleString()
                        : "";
                      const contentText = message.message.content || "";
                      const summary = contentText.length > 80 ? `${contentText.slice(0, 80)}…` : contentText;
                      const prefix = `跳转到消息：${senderName}${timeLabel ? ` 于 ${timeLabel}` : ""}`;
                      const handleJump = () => {
                        if (roomContext.scrollToGivenMessage)
                          roomContext.scrollToGivenMessage(message.message.messageId);
                        setIsSearching(false);
                      };
                      return (
                        <FloatingMotionItem
                          key={message.message.messageId}
                          index={index}
                          role="button"
                          tabIndex={0}
                          aria-label={summary ? `${prefix}：${summary}` : prefix}
                          title={`${prefix}：${contentText}`}
                          onClick={handleJump}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleJump();
                            }
                          }}
                        >
                          <SearchedMessage
                            message={message}
                            keyword={debouncedSearchText}
                            className="
                              px-4 py-3 border-b border-base-300/50
                              hover:bg-base-100
                              cursor-pointer transition-colors
                              last:border-b-0
                            "
                          />
                        </FloatingMotionItem>
                      );
                    })
                  )
                : (
                    <FloatingMotionItem
                      index={0}
                      className="
                        flex flex-col items-center justify-center py-8
                        text-base-content/50
                      "
                    >
                      <SearchFilled className="size-8 mb-2" />
                      <p className="text-sm">没有找到匹配的聊天记录</p>
                    </FloatingMotionItem>
                  )}
            </div>
          </FloatingMotionPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(SearchBar);
