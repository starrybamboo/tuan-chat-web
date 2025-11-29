import type { UserRole } from "../../../api";
import MobileSearchPage from "@/components/chat/mobileSearchPage";
import { RoomContext } from "@/components/chat/roomContext";
import SearchedMessage from "@/components/chat/smallComponents/searchedMessage";
import useGetRoleSmartly from "@/components/chat/smallComponents/useGetRoleName";
import { SearchFilled, XMarkICon } from "@/icons";
import { getScreenSize } from "@/utils/getScreenSize";
import { useDebounce } from "ahooks";
import { memo, use, useEffect, useMemo, useState } from "react";

interface SearchBarProps {
  className?: string;
}

function SearchBar({ className = "" }: SearchBarProps) {
  const roomContext = use(RoomContext);
  const historyMessages = useMemo(() => roomContext.chatHistory?.messages ?? [], [roomContext.chatHistory?.messages]);

  const [searchText, setSearchText] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const debouncedSearchText = useDebounce<string>(searchText, { wait: 300 });

  const [roles, setRoles] = useState<UserRole[]>([]);
  const getRoleSmartly = useGetRoleSmartly();

  // 检测是否为移动端
  const isMobile = getScreenSize() === "sm";

  useEffect(() => {
    const getAllRoles = async () => {
      for (const msg of historyMessages) {
        if (roles.find(r => r.roleId === msg.message.roleId))
          continue;
        const role = await getRoleSmartly(msg.message.roleId);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      handleClear();
    }
  };

  // 移动端的简化渲染
  if (isMobile) {
    return (
      <>
        <button
          onClick={handleSearch}
          className="p-2 text-base-content/60 hover:text-info hover:bg-base-300 rounded-lg transition-colors"
          type="button"
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
    <div className={`relative ${className}`}>
      {/* 搜索栏 */}
      <div className="flex items-center gap-1 bg-base-200 rounded-lg overflow-hidden">
        <div className="flex items-center flex-1 px-3 py-2">
          <input
            type="text"
            placeholder="搜索聊天记录..."
            className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-base-content/60"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {searchText && (
            <button
              onClick={handleClear}
              className="text-base-content/60 hover:text-base-content transition-colors ml-2"
              type="button"
            >
              <XMarkICon className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-2 text-base-content/60 hover:text-info hover:bg-base-300 transition-colors"
          disabled={!searchText.trim()}
          type="button"
        >
          <SearchFilled className="size-5" />
        </button>
      </div>

      {/* 搜索结果下拉 */}
      {isSearching && debouncedSearchText && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* 结果统计 */}
          <div className="px-4 py-2 text-xs text-base-content/70 bg-base-200 border-b border-base-300">
            找到
            {" "}
            {searchResult.length}
            {" "}
            条相关记录
            <button
              onClick={() => setIsSearching(false)}
              className="float-right text-base-content/60 hover:text-base-content"
              type="button"
            >
              <XMarkICon className="size-3" />
            </button>
          </div>

          {/* 结果列表 */}
          <div className="overflow-y-auto max-h-64">
            {searchResult.length > 0
              ? (
                  searchResult.map(message => (
                    <SearchedMessage
                      message={message}
                      keyword={debouncedSearchText}
                      key={message.message.messageId}
                      onClick={() => {
                        roomContext.scrollToGivenMessage && roomContext.scrollToGivenMessage(message.message.messageId);
                        setIsSearching(false);
                      }}
                      className="px-4 py-3 border-b border-base-300/50 hover:bg-base-100 cursor-pointer transition-colors last:border-b-0"
                    />
                  ))
                )
              : (
                  <div className="flex flex-col items-center justify-center py-8 text-base-content/50">
                    <SearchFilled className="size-8 mb-2" />
                    <p className="text-sm">没有找到匹配的聊天记录</p>
                  </div>
                )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SearchBar);
