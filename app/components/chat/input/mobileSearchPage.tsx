import type { UserRole } from "../../../../api";
import { useDebounce } from "ahooks";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RoomContext } from "@/components/chat/core/roomContext";
import SearchedMessage from "@/components/chat/message/preview/searchedMessage";
import useGetRoleSmartly from "@/components/chat/shared/components/useGetRoleName";
import { BaselineArrowBackIosNew, SearchFilled, XMarkICon } from "@/icons";

interface MobileSearchPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearchPage({ isOpen, onClose }: MobileSearchPageProps) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;
  const historyMessages = useMemo(() => roomContext.chatHistory?.messages ?? [], [roomContext.chatHistory?.messages]);

  const [searchText, setSearchText] = useState<string>("");
  const debouncedSearchText = useDebounce<string>(searchText, { wait: 300 });
  const inputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<UserRole[]>([]);
  const getRoleSmartly = useGetRoleSmartly();
  const roleCacheRef = useRef<Map<number, UserRole>>(new Map());
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

  useEffect(() => {
    roleCacheRef.current = new Map();
    setRoles([]);
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    const missingIds = roleIds.filter(id => !roleCacheRef.current.has(id));
    if (missingIds.length === 0) {
      return;
    }

    const getAllRoles = async () => {
      const fetched: UserRole[] = [];
      for (const roleId of missingIds) {
        const role = await getRoleSmartly(roleId);
        if (!role)
          continue;
        const id = role.roleId;
        if (typeof id !== "number" || !Number.isFinite(id))
          continue;
        if (roleCacheRef.current.has(id))
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
  }, [getRoleSmartly, roleIds]);

  const searchResult = useMemo(() => {
    if (!debouncedSearchText || debouncedSearchText.length === 0)
      return [];
    return historyMessages.filter(message =>
      message.message.content.includes(debouncedSearchText)
      || roles.find(role => role.roleId === message.message.roleId)
        ?.roleName
        ?.includes(debouncedSearchText));
  }, [debouncedSearchText, historyMessages, roles]);

  // 当页面打开时自动聚焦搜索框
  useEffect(() => {
    let focusTimeout: ReturnType<typeof setTimeout> | undefined;
    if (isOpen && inputRef.current) {
      focusTimeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }

    return () => {
      if (focusTimeout)
        clearTimeout(focusTimeout);
    };
  }, [isOpen]);

  // 重置搜索状态当关闭时
  useEffect(() => {
    if (!isOpen) {
      setSearchText("");
    }
  }, [isOpen]);

  // 打开搜索页时锁定页面滚动，避免底层内容穿透滚动
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const mobileSearchContent = (
    <div className="fixed inset-0 z-[10000] bg-base-100 flex flex-col">
      {/* 顶部搜索栏 */}
      <div
        className="sticky top-0 z-10 border-b border-base-300 bg-base-100/95 backdrop-blur"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 px-3 pb-2">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-square btn-sm shrink-0"
            type="button"
            aria-label="返回聊天"
          >
            <BaselineArrowBackIosNew className="size-5" />
          </button>

          <div className="flex h-10 items-center flex-1 bg-base-200 rounded-xl px-3 border border-base-300">
            <SearchFilled className="size-4 text-base-content/60 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索聊天记录..."
              className="bg-transparent border-none outline-none flex-1 min-w-0 text-sm placeholder:text-base-content/60"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            {searchText && (
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square ml-1"
                onClick={() => setSearchText("")}
                aria-label="清空搜索"
              >
                <XMarkICon className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 搜索结果内容 */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {debouncedSearchText
          ? (
              <div className="h-full min-h-0 flex flex-col">
                {/* 结果统计 */}
                <div className="px-4 py-3 bg-base-200 border-b border-base-300">
                  <div className="text-sm text-base-content/70">
                    找到
                    {" "}
                    {searchResult.length}
                    {" "}
                    条相关记录
                  </div>
                </div>

                {/* 结果列表 */}
                <div className="flex-1 overflow-y-auto">
                  {searchResult.length > 0
                    ? (
                        <div className="divide-y divide-base-300">
                          {searchResult.map(message => (
                            <SearchedMessage
                              message={message}
                              keyword={debouncedSearchText}
                              key={message.message.messageId}
                              onClick={() => {
                                roomContext.scrollToGivenMessage && roomContext.scrollToGivenMessage(message.message.messageId);
                                onClose();
                              }}
                              className="px-4 py-4 hover:bg-base-200 active:bg-base-300 cursor-pointer transition-colors"
                            />
                          ))}
                        </div>
                      )
                    : (
                        <div className="flex flex-col items-center justify-center h-full text-base-content/50 px-4">
                          <SearchFilled className="size-16 mb-4 text-base-content/30" />
                          <p className="text-lg font-medium mb-2">没有找到匹配的聊天记录</p>
                          <p className="text-sm text-center">
                            尝试使用不同的关键词搜索
                          </p>
                        </div>
                      )}
                </div>
              </div>
            )
          : (
              <div className="flex flex-col items-center justify-center h-full text-base-content/50 px-4">
                <SearchFilled className="size-16 mb-4 text-base-content/30" />
                <p className="text-lg font-medium mb-2">搜索消息</p>
                <p className="text-sm text-center">
                  输入关键词搜索消息内容或角色名
                </p>
              </div>
            )}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(mobileSearchContent, document.body);
}
