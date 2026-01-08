import type { UserRole } from "../../../../api";
import { useDebounce } from "ahooks";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import SearchedMessage from "@/components/chat/message/preview/searchedMessage";
import useGetRoleSmartly from "@/components/chat/shared/components/useGetRoleName";
import { BaselineArrowBackIosNew, SearchFilled } from "@/icons";

interface MobileSearchPageProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearchPage({ isOpen, onClose }: MobileSearchPageProps) {
  const roomContext = use(RoomContext);
  const historyMessages = useMemo(() => roomContext.chatHistory?.messages ?? [], [roomContext.chatHistory?.messages]);

  const [searchText, setSearchText] = useState<string>("");
  const debouncedSearchText = useDebounce<string>(searchText, { wait: 300 });
  const inputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<UserRole[]>([]);
  const getRoleSmartly = useGetRoleSmartly();

  useEffect(() => {
    const getAllRoles = async () => {
      for (const msg of historyMessages) {
        const roleId = msg.message.roleId;
        if (roleId == null)
          continue;
        if (roles.find(r => r.roleId === roleId))
          continue;
        const role = await getRoleSmartly(roleId);
        if (!role)
          continue;
        setRoles(prev => [...prev, role]);
      }
    };
    getAllRoles();
  }, [historyMessages, getRoleSmartly, roles]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-base-100 z-50 flex flex-col">
      {/* 顶部搜索栏 */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300 bg-base-100">
        <button
          onClick={onClose}
          className="text-base-content/70 hover:text-base-content transition-colors"
          type="button"
        >
          <BaselineArrowBackIosNew className="size-6" />
        </button>

        <div className="flex items-center flex-1 bg-base-200 rounded-lg px-3 py-2">
          <SearchFilled className="size-5 text-base-content/60 mr-2" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索聊天记录..."
            className="bg-transparent border-none outline-none flex-1 text-base placeholder:text-base-content/60"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* 搜索结果内容 */}
      <div className="flex-1 overflow-hidden">
        {debouncedSearchText
          ? (
              <div className="h-full flex flex-col">
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
                <p className="text-lg font-medium mb-2">搜索聊天记录</p>
                <p className="text-sm text-center">
                  输入关键词来搜索历史消息和角色名称
                </p>
              </div>
            )}
      </div>
    </div>
  );
}
